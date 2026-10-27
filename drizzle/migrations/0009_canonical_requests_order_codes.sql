-- Central, atomic order-code allocation shared by website orders and email-created requests.
CREATE TABLE public.order_code_counters (
  year integer PRIMARY KEY,
  last_seq integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.order_code_counters TO service_role;
REVOKE ALL ON public.order_code_counters FROM anon, authenticated;
ALTER TABLE public.order_code_counters ENABLE ROW LEVEL SECURITY;

-- One canonical row per real request (website + email + replies). Service-role only.
CREATE TABLE public.mail_sync_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text NOT NULL UNIQUE,
  notion_page_id text UNIQUE,
  notion_claim_until timestamptz,
  source text NOT NULL,
  customer_email text,
  subject text,
  order_id uuid,
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mail_sync_requests TO service_role;
REVOKE ALL ON public.mail_sync_requests FROM anon, authenticated;
ALTER TABLE public.mail_sync_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX mail_sync_requests_email_idx ON public.mail_sync_requests (customer_email);

-- Identity keys (submission:<id>, order:<code>, msg:<Message-ID>) -> canonical request. The primary
-- key makes every key belong to exactly one request, so retries and races cannot create a second one.
CREATE TABLE public.mail_sync_request_keys (
  key text PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.mail_sync_requests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mail_sync_request_keys TO service_role;
REVOKE ALL ON public.mail_sync_request_keys FROM anon, authenticated;
ALTER TABLE public.mail_sync_request_keys ENABLE ROW LEVEL SECURITY;
CREATE INDEX mail_sync_request_keys_request_idx ON public.mail_sync_request_keys (request_id);

CREATE OR REPLACE FUNCTION public.allocate_order_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  yr int := extract(year from now())::int;
  pat text := '^TR-' || yr || '-[0-9]+$';
  s int;
  code text;
BEGIN
  LOOP
    INSERT INTO public.order_code_counters AS c (year, last_seq)
    VALUES (
      yr,
      GREATEST(
        (SELECT COALESCE(MAX(split_part(order_code, '-', 3)::int), 0) FROM public.orders WHERE order_code ~ pat),
        (SELECT COALESCE(MAX(split_part(order_code, '-', 3)::int), 0) FROM public.mail_sync_requests WHERE order_code ~ pat)
      ) + 1
    )
    ON CONFLICT (year) DO UPDATE SET last_seq = c.last_seq + 1, updated_at = now()
    RETURNING last_seq INTO s;
    code := 'TR-' || yr || '-' || lpad(s::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_code = code)
          AND NOT EXISTS (SELECT 1 FROM public.mail_sync_requests WHERE order_code = code);
  END LOOP;
  RETURN code;
END;
$$;
REVOKE ALL ON FUNCTION public.allocate_order_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_order_code() TO service_role;

-- Website orders now draw from the same atomic counter (previously MAX()+1, which could race).
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.order_code IS NOT NULL THEN RETURN NEW; END IF;
  NEW.order_code := public.allocate_order_code();
  RETURN NEW;
END;
$$;

-- Find-or-create a canonical request for a set of identity keys, serialized by an advisory lock.
-- conflict = the keys already belong to more than one request (left for human review).
CREATE OR REPLACE FUNCTION public.mail_sync_claim_request(
  _keys text[],
  _source text,
  _email text,
  _subject text,
  _order_code text DEFAULT NULL,
  _order_id uuid DEFAULT NULL
)
RETURNS TABLE(request_id uuid, order_code text, notion_page_id text, created boolean, conflict boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ids uuid[];
  rid uuid;
  made boolean := false;
BEGIN
  IF _keys IS NULL OR coalesce(array_length(_keys, 1), 0) = 0 THEN
    RAISE EXCEPTION 'mail_sync_claim_request: keys required';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('mail_sync_claim_request'));
  SELECT array_agg(DISTINCT k.request_id) INTO ids
    FROM public.mail_sync_request_keys k WHERE k.key = ANY(_keys);
  IF ids IS NOT NULL AND array_length(ids, 1) > 1 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, false, true;
    RETURN;
  END IF;
  IF ids IS NOT NULL THEN
    rid := ids[1];
  ELSIF _order_code IS NOT NULL THEN
    SELECT r.id INTO rid FROM public.mail_sync_requests r WHERE r.order_code = _order_code;
  END IF;
  IF rid IS NULL THEN
    INSERT INTO public.mail_sync_requests (order_code, source, customer_email, subject, order_id)
    VALUES (COALESCE(_order_code, public.allocate_order_code()), _source, lower(_email), left(_subject, 500), _order_id)
    RETURNING id INTO rid;
    made := true;
  END IF;
  INSERT INTO public.mail_sync_request_keys (key, request_id)
    SELECT DISTINCT unnest(_keys), rid
    ON CONFLICT (key) DO NOTHING;
  RETURN QUERY
    SELECT r.id, r.order_code, r.notion_page_id, made, false
    FROM public.mail_sync_requests r WHERE r.id = rid;
END;
$$;
REVOKE ALL ON FUNCTION public.mail_sync_claim_request(text[], text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mail_sync_claim_request(text[], text, text, text, text, uuid) TO service_role;