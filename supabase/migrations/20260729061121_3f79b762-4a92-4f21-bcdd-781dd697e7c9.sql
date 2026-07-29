CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

CREATE TABLE public.quote_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL CHECK (new_status IN ('accepted','declined')),
  admin_user uuid,
  accepted_price numeric,
  currency text NOT NULL DEFAULT 'EUR',
  delivery_time text,
  payment_terms text,
  decline_reason_code text,
  decline_reason_text text,
  customer_message text,
  recipient_email text,
  email_subject text,
  email_status text NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending','sent','failed')),
  email_message_id text,
  email_error text,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quote_decisions_order_id_idx ON public.quote_decisions(order_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_decisions TO authenticated;
GRANT ALL ON public.quote_decisions TO service_role;
ALTER TABLE public.quote_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_decisions_admin_all ON public.quote_decisions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.proformas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  number text NOT NULL UNIQUE,
  revision integer NOT NULL DEFAULT 0,
  parent_proforma_id uuid REFERENCES public.proformas(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generated','sent','paid','cancelled')),
  customer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  financial_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  due_date date,
  deposit_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  pdf_path text,
  pdf_generated_at timestamptz,
  order_signature text,
  auto_sync boolean NOT NULL DEFAULT true,
  sent_at timestamptz,
  recipient text,
  cc text,
  subject text,
  body text,
  email_status text CHECK (email_status IN ('pending','sent','failed')),
  email_message_id text,
  email_error text,
  admin_user uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX proformas_order_idx ON public.proformas(order_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proformas TO authenticated;
GRANT ALL ON public.proformas TO service_role;
ALTER TABLE public.proformas ENABLE ROW LEVEL SECURITY;
CREATE POLICY proformas_admin_all ON public.proformas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER proformas_updated_at BEFORE UPDATE ON public.proformas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.proforma_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proforma_id uuid NOT NULL REFERENCES public.proformas(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  qty numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'pcs',
  unit_price numeric NOT NULL DEFAULT 0,
  discount_pct numeric NOT NULL DEFAULT 0,
  vat_pct numeric NOT NULL DEFAULT 24,
  auto_managed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX proforma_lines_proforma_idx ON public.proforma_lines(proforma_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proforma_lines TO authenticated;
GRANT ALL ON public.proforma_lines TO service_role;
ALTER TABLE public.proforma_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY proforma_lines_admin_all ON public.proforma_lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.next_proforma_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE yr text := to_char(now(),'YYYY'); seq int;
BEGIN
  SELECT COALESCE(MAX(CAST(split_part(number,'-',3) AS int)),0) + 1
    INTO seq FROM public.proformas
   WHERE number LIKE 'INV-' || yr || '-%' AND revision = 0;
  RETURN 'INV-' || yr || '-' || lpad(seq::text, 4, '0');
END $$;
GRANT EXECUTE ON FUNCTION public.next_proforma_number() TO authenticated;