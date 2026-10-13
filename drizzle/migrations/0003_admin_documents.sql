CREATE TABLE public.admin_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL CHECK (doc_type IN ('offer','order_form')),
  number text NOT NULL,
  order_id uuid NOT NULL,
  order_code text,
  customer_name text,
  customer_email text,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','sending','sent','failed')),
  pdf_path text,
  pdf_sha256 text,
  pdf_generated_at timestamptz,
  approved_by text,
  approved_at timestamptz,
  approved_pdf_sha256 text,
  recipient text,
  email_subject text,
  sent_at timestamptz,
  email_message_id text,
  email_error text,
  send_attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doc_type, number)
);
GRANT ALL ON public.admin_documents TO service_role;
ALTER TABLE public.admin_documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX admin_documents_order_idx ON public.admin_documents (order_id);
CREATE INDEX admin_documents_created_idx ON public.admin_documents (created_at DESC);
CREATE TRIGGER admin_documents_touch BEFORE UPDATE ON public.admin_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
COMMENT ON TABLE public.admin_documents IS 'Admin Offer / Order Form PDFs filled from original templates. Service-role only.';