CREATE TABLE public.order_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_code text,
  email_type text NOT NULL DEFAULT 'other',
  recipient text NOT NULL,
  cc text,
  sender text,
  reply_to text,
  subject text NOT NULL,
  provider text NOT NULL DEFAULT 'resend',
  provider_message_id text,
  status text NOT NULL DEFAULT 'pending',
  http_status integer,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  attachments_count integer NOT NULL DEFAULT 0,
  html text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_emails_order_id ON public.order_emails(order_id);
CREATE INDEX idx_order_emails_created_at ON public.order_emails(created_at DESC);
CREATE INDEX idx_order_emails_status ON public.order_emails(status);
CREATE UNIQUE INDEX idx_order_emails_provider_message_id ON public.order_emails(provider_message_id) WHERE provider_message_id IS NOT NULL;

GRANT ALL ON public.order_emails TO service_role;

ALTER TABLE public.order_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_emails service only" ON public.order_emails FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_order_emails_updated
BEFORE UPDATE ON public.order_emails
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();