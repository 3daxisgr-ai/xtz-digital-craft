ALTER TABLE public.mail_sync_runs DROP CONSTRAINT IF EXISTS mail_sync_runs_mode_check;
ALTER TABLE public.mail_sync_runs ADD CONSTRAINT mail_sync_runs_mode_check
  CHECK (mode = ANY (ARRAY['dry','live','probe','history_preview','history','reconcile','reconcile_preview']));

-- Scheduler credential: only a SHA-256 hash is stored here; the server compares a presented token's hash.
CREATE TABLE IF NOT EXISTS public.mail_sync_cron_auth (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  token_hash text NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mail_sync_cron_auth TO service_role;
REVOKE ALL ON public.mail_sync_cron_auth FROM anon, authenticated;
ALTER TABLE public.mail_sync_cron_auth ENABLE ROW LEVEL SECURITY;

-- Scheduler status for the admin page (job cadence, active flag, last calls). Service role only.
CREATE OR REPLACE FUNCTION public.mail_sync_scheduler_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'jobs', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', j.jobname, 'schedule', j.schedule, 'active', j.active))
      FROM cron.job j WHERE j.jobname LIKE 'toreo-mail-sync%'), '[]'::jsonb),
    'recent', COALESCE((
      SELECT jsonb_agg(s.x ORDER BY s.x->>'start' DESC) FROM (
        SELECT jsonb_build_object('start', d.start_time, 'status', d.status) AS x
        FROM cron.job_run_details d
        JOIN cron.job j ON j.jobid = d.jobid
        WHERE j.jobname LIKE 'toreo-mail-sync%'
        ORDER BY d.start_time DESC
        LIMIT 5) s), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.mail_sync_scheduler_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mail_sync_scheduler_status() TO service_role;