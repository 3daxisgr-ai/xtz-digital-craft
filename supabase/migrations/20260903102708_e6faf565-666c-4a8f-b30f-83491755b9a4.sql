CREATE TABLE public.email_order_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL UNIQUE,
  thread_id text,
  from_email text NOT NULL,
  from_name text,
  to_email text,
  subject text,
  body_text text,
  received_at timestamptz NOT NULL DEFAULT now(),
  ai_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric NOT NULL DEFAULT 0,
  missing_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new',
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_order_intake_status_check CHECK (status IN ('new','needs_confirmation','processed','failed'))
);

CREATE INDEX idx_email_order_intake_status ON public.email_order_intake (status, received_at DESC);
CREATE INDEX idx_email_order_intake_from_email ON public.email_order_intake (lower(from_email));

GRANT SELECT ON public.email_order_intake TO authenticated;
GRANT ALL ON public.email_order_intake TO service_role;

ALTER TABLE public.email_order_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email intake"
  ON public.email_order_intake FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_email_order_intake_updated
  BEFORE UPDATE ON public.email_order_intake
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();