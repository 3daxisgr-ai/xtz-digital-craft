
-- 1) Extend factory_settings with config surface fields
ALTER TABLE public.factory_settings
  ADD COLUMN IF NOT EXISTS urgency_surcharge_flexible_eur numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS urgency_surcharge_standard_eur numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS urgency_surcharge_urgent_eur numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS urgency_high_load_threshold_hours numeric NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS company_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS timeline_stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_modules jsonb NOT NULL DEFAULT '{"analysis":true,"pricing":true,"machine_assignment":true,"calendar_automation":true,"scheduler_automation":true,"customer_ai_visible":false}'::jsonb;

-- 2) Tighten SELECT policies on reference tables (drop USING(true) if present)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='factory_settings' AND policyname='read settings') THEN
    DROP POLICY "read settings" ON public.factory_settings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='machines' AND policyname='read machines') THEN
    DROP POLICY "read machines" ON public.machines;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='materials' AND policyname='read materials') THEN
    DROP POLICY "read materials" ON public.materials;
  END IF;
END $$;

-- Authenticated-only reads (server functions use the service role and bypass RLS)
CREATE POLICY "authenticated read settings" ON public.factory_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read machines" ON public.machines
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read materials" ON public.materials
  FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.factory_settings FROM anon;
REVOKE SELECT ON public.machines FROM anon;
REVOKE SELECT ON public.materials FROM anon;
