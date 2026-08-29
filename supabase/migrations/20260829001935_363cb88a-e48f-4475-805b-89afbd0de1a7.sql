-- ============ REQUEST INTAKE LEDGER (idempotency + duplicate intelligence) ============
CREATE TABLE public.request_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'web_form',           -- web_form | inbound_email | manual
  provider_message_id text,                            -- Resend/provider id
  message_id_header text,                              -- RFC Message-ID
  thread_id text,
  sender_email text NOT NULL,
  sender_name text,
  subject_raw text,
  subject_normalized text,
  body_hash text,
  attachments_hash text,
  fingerprint text NOT NULL,                           -- stable identity of the request content
  received_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,

  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  submission_id uuid,

  duplicate_class text NOT NULL DEFAULT 'not_duplicate',  -- exact | near | same_project | not_duplicate
  duplicate_confidence numeric NOT NULL DEFAULT 0,        -- 0..100
  duplicate_of_intake_id uuid REFERENCES public.request_intake(id) ON DELETE SET NULL,
  duplicate_of_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  duplicate_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,

  process_result text NOT NULL DEFAULT 'created',      -- created | skipped_duplicate | needs_review
  review_state text NOT NULL DEFAULT 'none',           -- none | pending | kept_new | merged | ignored
  reviewed_at timestamptz,
  reviewed_by text,

  ai_extraction jsonb,
  ai_summary text,
  ai_summary_edited boolean NOT NULL DEFAULT false,
  ai_missing jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_confidence integer,
  ai_next_action text,
  ai_urgency text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.request_intake TO service_role;
ALTER TABLE public.request_intake ENABLE ROW LEVEL SECURITY;
CREATE POLICY "request_intake service only" ON public.request_intake
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX request_intake_provider_msg_uidx
  ON public.request_intake (provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE UNIQUE INDEX request_intake_msgid_header_uidx
  ON public.request_intake (message_id_header) WHERE message_id_header IS NOT NULL;
CREATE UNIQUE INDEX request_intake_fingerprint_uidx
  ON public.request_intake (fingerprint);
CREATE INDEX request_intake_sender_idx ON public.request_intake (lower(sender_email), received_at DESC);
CREATE INDEX request_intake_order_idx ON public.request_intake (order_id);
CREATE INDEX request_intake_review_idx ON public.request_intake (review_state, received_at DESC);

CREATE TRIGGER trg_request_intake_updated
  BEFORE UPDATE ON public.request_intake
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AI SETTINGS (single row) ============
CREATE TABLE public.ai_settings (
  id integer PRIMARY KEY DEFAULT 1,
  singleton boolean NOT NULL DEFAULT true,
  provider text NOT NULL DEFAULT 'lovable',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  fallback_model text DEFAULT 'google/gemini-2.5-flash-lite',
  temperature numeric NOT NULL DEFAULT 0.3,
  max_output_tokens integer NOT NULL DEFAULT 1200,
  daily_call_limit integer NOT NULL DEFAULT 2000,
  monthly_call_limit integer NOT NULL DEFAULT 40000,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_settings_singleton CHECK (id = 1)
);

GRANT ALL ON public.ai_settings TO service_role;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_settings service only" ON public.ai_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_ai_settings_updated
  BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============ AI USAGE LOG ============
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  ok boolean NOT NULL DEFAULT true,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  latency_ms integer,
  error_message text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.ai_usage_log TO service_role;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_usage_log service only" ON public.ai_usage_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX ai_usage_log_created_idx ON public.ai_usage_log (created_at DESC);

-- ============ EMAIL HISTORY EXTRAS ============
ALTER TABLE public.order_emails
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'outgoing',
  ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_instruction text,
  ADD COLUMN IF NOT EXISTS ai_regenerations integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS body_text text,
  ADD COLUMN IF NOT EXISTS thread_id text,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS order_emails_idempotency_uidx
  ON public.order_emails (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS order_emails_order_created_idx
  ON public.order_emails (order_id, created_at DESC);