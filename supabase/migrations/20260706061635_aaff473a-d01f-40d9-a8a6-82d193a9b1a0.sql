
-- Production job state
DO $$ BEGIN
  CREATE TYPE public.production_job_state AS ENUM ('queued','ready','running','paused','blocked','done','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.production_risk AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Production jobs
CREATE TABLE IF NOT EXISTS public.production_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  analysis_id uuid REFERENCES public.project_analyses(id) ON DELETE SET NULL,
  state public.production_job_state NOT NULL DEFAULT 'queued',
  priority_score numeric(6,2) NOT NULL DEFAULT 0,
  risk public.production_risk NOT NULL DEFAULT 'low',
  planned_start timestamptz,
  planned_finish timestamptz,
  actual_start timestamptz,
  actual_finish timestamptz,
  estimated_hours numeric(8,2),
  material_code text,
  overnight_ok boolean NOT NULL DEFAULT false,
  queue_position int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.production_jobs TO authenticated;
GRANT ALL ON public.production_jobs TO service_role;

ALTER TABLE public.production_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer read own jobs" ON public.production_jobs
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = production_jobs.order_id AND o.user_id = auth.uid())
    OR private.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "admin manage jobs" ON public.production_jobs
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_pj_machine_start ON public.production_jobs(machine_id, planned_start);
CREATE INDEX IF NOT EXISTS idx_pj_state ON public.production_jobs(state);
CREATE INDEX IF NOT EXISTS idx_pj_order ON public.production_jobs(order_id);

CREATE TRIGGER trg_pj_updated BEFORE UPDATE ON public.production_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Machine calendar blocks (maintenance / reserved)
CREATE TABLE IF NOT EXISTS public.machine_calendar_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'maintenance',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

GRANT SELECT ON public.machine_calendar_blocks TO authenticated;
GRANT ALL ON public.machine_calendar_blocks TO service_role;

ALTER TABLE public.machine_calendar_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read blocks" ON public.machine_calendar_blocks
  FOR SELECT USING (true);

CREATE POLICY "admin manage blocks" ON public.machine_calendar_blocks
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_mcb_machine_time ON public.machine_calendar_blocks(machine_id, starts_at);

CREATE TRIGGER trg_mcb_updated BEFORE UPDATE ON public.machine_calendar_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
