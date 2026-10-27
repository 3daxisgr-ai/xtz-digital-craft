ALTER TABLE public.mail_sync_settings
  ADD COLUMN history_import boolean NOT NULL DEFAULT false,
  ADD COLUMN history_cutoff date NOT NULL DEFAULT '2026-06-10',
  ADD COLUMN history_stale_days integer NOT NULL DEFAULT 60;
ALTER TABLE public.mail_sync_settings ADD CONSTRAINT mail_sync_settings_history_caps CHECK (history_stale_days BETWEEN 7 AND 365 AND history_cutoff >= '2020-01-01');
ALTER TABLE public.mail_sync_runs ADD COLUMN approved_at timestamptz, ADD COLUMN approved_by text;
ALTER TABLE public.mail_sync_runs DROP CONSTRAINT mail_sync_runs_mode_check;
ALTER TABLE public.mail_sync_runs ADD CONSTRAINT mail_sync_runs_mode_check CHECK (mode IN ('dry','live','probe','history_preview','history'));
REVOKE ALL ON public.mail_sync_settings, public.mail_sync_runs FROM anon, authenticated;