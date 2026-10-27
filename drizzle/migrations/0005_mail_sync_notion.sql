-- Email (info@toreo.gr) -> Notion sync. Service-role only: no anon/authenticated policies.
CREATE TABLE public.mail_sync_settings (
  id integer PRIMARY KEY DEFAULT 1,
  live_writes boolean NOT NULL DEFAULT false,
  website_hook boolean NOT NULL DEFAULT false,
  max_per_folder integer NOT NULL DEFAULT 5,
  lookback_days integer NOT NULL DEFAULT 7,
  min_interval_seconds integer NOT NULL DEFAULT 60,
  lock_until timestamptz,
  last_run_at timestamptz,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mail_sync_settings_singleton CHECK (id = 1),
  CONSTRAINT mail_sync_settings_caps CHECK (max_per_folder BETWEEN 1 AND 25 AND lookback_days BETWEEN 1 AND 60 AND min_interval_seconds BETWEEN 30 AND 3600)
);
INSERT INTO public.mail_sync_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.mail_sync_state (
  folder text PRIMARY KEY,
  uidvalidity bigint,
  last_uid bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.mail_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL CHECK (mode IN ('dry','live','probe')),
  trigger text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  ok boolean,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);
CREATE INDEX mail_sync_runs_started_idx ON public.mail_sync_runs (started_at DESC);

CREATE TABLE public.mail_sync_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL UNIQUE,
  folder text NOT NULL,
  uid bigint,
  direction text NOT NULL CHECK (direction IN ('incoming','outgoing','website')),
  in_reply_to text,
  refs text[] NOT NULL DEFAULT '{}',
  thread_root text,
  from_email text,
  from_name text,
  to_emails text[] NOT NULL DEFAULT '{}',
  subject text,
  sent_at timestamptz,
  snippet text,
  attachment_names text[] NOT NULL DEFAULT '{}',
  classification text,
  action text,
  match_reason text,
  notion_order_page_id text,
  notion_order_record text,
  notion_log_page_id text,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','synced','manual_review','skipped','failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mail_sync_messages_thread_idx ON public.mail_sync_messages (thread_root);
CREATE INDEX mail_sync_messages_status_idx ON public.mail_sync_messages (status, created_at DESC);

GRANT ALL ON public.mail_sync_settings TO service_role;
GRANT ALL ON public.mail_sync_state TO service_role;
GRANT ALL ON public.mail_sync_runs TO service_role;
GRANT ALL ON public.mail_sync_messages TO service_role;

ALTER TABLE public.mail_sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_sync_messages ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_mail_sync_settings_updated BEFORE UPDATE ON public.mail_sync_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mail_sync_state_updated BEFORE UPDATE ON public.mail_sync_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mail_sync_messages_updated BEFORE UPDATE ON public.mail_sync_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
