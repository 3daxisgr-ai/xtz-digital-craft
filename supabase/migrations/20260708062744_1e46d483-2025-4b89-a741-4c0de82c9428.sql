
ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS total_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hours_since_service numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_interval_hours numeric NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS last_service_at timestamptz;
