
-- Extend analyses
ALTER TABLE public.project_analyses
  ADD COLUMN IF NOT EXISTS complexity_band text,
  ADD COLUMN IF NOT EXISTS confidence_band text,
  ADD COLUMN IF NOT EXISTS recommended_orientation text,
  ADD COLUMN IF NOT EXISTS estimated_layers integer,
  ADD COLUMN IF NOT EXISTS extrusion_length_m numeric(10,2),
  ADD COLUMN IF NOT EXISTS travel_length_m numeric(10,2),
  ADD COLUMN IF NOT EXISTS support_volume_cm3 numeric(10,2),
  ADD COLUMN IF NOT EXISTS support_hours numeric(6,2),
  ADD COLUMN IF NOT EXISTS support_difficulty text,
  ADD COLUMN IF NOT EXISTS quality_predictions jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS risk_analysis jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cost_breakdown jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS price_explanation text,
  ADD COLUMN IF NOT EXISTS admin_overrides jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS actual_print_hours numeric(8,2),
  ADD COLUMN IF NOT EXISTS actual_material_g numeric(10,2),
  ADD COLUMN IF NOT EXISTS actual_cost_eur numeric(10,2);

-- Factory settings singleton
CREATE TABLE IF NOT EXISTS public.factory_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  min_margin_pct numeric(5,2) NOT NULL DEFAULT 45,
  min_hourly_rate_eur numeric(8,2) NOT NULL DEFAULT 8,
  min_production_charge_eur numeric(8,2) NOT NULL DEFAULT 15,
  min_order_value_eur numeric(8,2) NOT NULL DEFAULT 15,
  allow_overnight_default boolean NOT NULL DEFAULT false,
  currency text NOT NULL DEFAULT 'EUR',
  work_start_hour numeric(4,2) NOT NULL DEFAULT 8.5,
  work_end_hour numeric(4,2) NOT NULL DEFAULT 16,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.factory_settings TO authenticated;
GRANT ALL ON public.factory_settings TO service_role;

ALTER TABLE public.factory_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read settings" ON public.factory_settings FOR SELECT USING (true);
CREATE POLICY "admin manage settings" ON public.factory_settings
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_fs_updated BEFORE UPDATE ON public.factory_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default row
INSERT INTO public.factory_settings (singleton) VALUES (true)
  ON CONFLICT (singleton) DO NOTHING;
