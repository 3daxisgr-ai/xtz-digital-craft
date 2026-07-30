CREATE SEQUENCE IF NOT EXISTS public.quote_doc_seq START 1;

CREATE TABLE IF NOT EXISTS public.quote_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  seq integer NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  replaces_quote_id uuid REFERENCES public.quote_documents(id) ON DELETE SET NULL,
  customer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  financial_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  project jsonb NOT NULL DEFAULT '{}'::jsonb,
  terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_path text,
  image_data_url text,
  status text NOT NULL DEFAULT 'draft',
  pdf_path text,
  pdf_generated_at timestamptz,
  data_signature text,
  recipient text,
  cc text,
  email_subject text,
  email_body text,
  sent_at timestamptz,
  admin_user text,
  email_status text,
  email_message_id text,
  email_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_documents_number_key UNIQUE (number),
  CONSTRAINT quote_documents_seq_key UNIQUE (seq),
  CONSTRAINT quote_documents_status_chk CHECK (status IN ('draft','generated','sent','accepted_by_customer','rejected_by_customer','cancelled','replaced'))
);

CREATE INDEX IF NOT EXISTS quote_documents_order_idx ON public.quote_documents(order_id);

GRANT ALL ON public.quote_documents TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.quote_doc_seq TO service_role;

ALTER TABLE public.quote_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages quote documents"
  ON public.quote_documents FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.next_quote_number()
RETURNS TABLE(number text, seq integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  n := nextval('public.quote_doc_seq');
  RETURN QUERY SELECT 'TR-' || lpad(n::text, 4, '0'), n;
END;
$$;

REVOKE ALL ON FUNCTION public.next_quote_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_quote_number() TO service_role;

CREATE TRIGGER quote_documents_updated_at
  BEFORE UPDATE ON public.quote_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();