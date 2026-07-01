
-- Universal projects (each customer request = 1 project, may contain multiple parts/files)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT UNIQUE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  service TEXT NOT NULL DEFAULT '3d_printing',
  production_mode TEXT DEFAULT 'prototype', -- prototype | durable | decorative
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'normal',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin projects" ON public.projects
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Machines (printers, CNC, laser, ...)
CREATE TABLE IF NOT EXISTS public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL, -- printer | cnc | laser | press_brake | welder | ...
  vendor TEXT,
  model TEXT,
  build_volume_mm JSONB, -- {x,y,z}
  nozzles JSONB,        -- ["0.2","0.4","0.6","0.8"]
  hourly_cost NUMERIC(10,2) DEFAULT 0,
  power_watts INT,
  status TEXT NOT NULL DEFAULT 'idle', -- idle | running | maintenance | offline
  specs JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.machines TO anon, authenticated;
GRANT ALL ON public.machines TO service_role;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read machines" ON public.machines FOR SELECT USING (true);
CREATE POLICY "admin write machines" ON public.machines
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_machines_updated BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Materials
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  family TEXT NOT NULL, -- PLA | PETG | ABS | ASA | PA | PC | TPU | ALUMINUM | STEEL | ...
  process TEXT NOT NULL, -- 3d_printing | cnc | laser
  color TEXT,
  price_per_kg NUMERIC(10,2),
  density_g_cm3 NUMERIC(6,3),
  stock_kg NUMERIC(10,3) DEFAULT 0,
  properties JSONB DEFAULT '{}'::jsonb, -- {tensile_mpa, temp_c, uv, food_safe, ...}
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.materials TO anon, authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read materials" ON public.materials FOR SELECT USING (true);
CREATE POLICY "admin write materials" ON public.materials
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_materials_updated BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AI analyses (DFM, cost, recommendations) for uploaded files
CREATE TABLE IF NOT EXISTS public.project_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.order_files(id) ON DELETE SET NULL,
  file_name TEXT,
  service TEXT NOT NULL DEFAULT '3d_printing',
  production_mode TEXT,
  dfm_score INT,           -- 0-100
  complexity_score INT,    -- 0-100
  printability_score INT,  -- 0-100
  recommended_material TEXT,
  recommended_nozzle TEXT,
  recommended_layer_height_mm NUMERIC(4,2),
  recommended_infill_pct INT,
  estimated_print_hours NUMERIC(8,2),
  estimated_material_g NUMERIC(10,2),
  estimated_cost_eur NUMERIC(10,2),
  quote_price_eur NUMERIC(10,2),
  confidence INT, -- 0-100
  ai_summary TEXT,
  ai_warnings JSONB DEFAULT '[]'::jsonb,
  ai_recommendations JSONB DEFAULT '[]'::jsonb,
  raw JSONB DEFAULT '{}'::jsonb,
  created_by TEXT DEFAULT 'ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_analyses TO authenticated;
GRANT ALL ON public.project_analyses TO service_role;
ALTER TABLE public.project_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own analyses or admin" ON public.project_analyses
  FOR SELECT TO authenticated USING (
    private.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = project_analyses.order_id AND o.user_id = auth.uid())
  );
CREATE POLICY "admin write analyses" ON public.project_analyses
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- Project code generator (TR-P-YYYY-NNNN)
CREATE OR REPLACE FUNCTION public.generate_project_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE yr text; seq int;
BEGIN
  IF NEW.project_code IS NOT NULL THEN RETURN NEW; END IF;
  yr := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(split_part(project_code, '-', 4) AS int)), 0) + 1
    INTO seq FROM public.projects WHERE project_code LIKE 'TR-P-' || yr || '-%';
  NEW.project_code := 'TR-P-' || yr || '-' || lpad(seq::text, 4, '0');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_projects_code BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.generate_project_code();

CREATE INDEX IF NOT EXISTS idx_projects_order ON public.projects(order_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_order ON public.project_analyses(order_id);
CREATE INDEX IF NOT EXISTS idx_analyses_project ON public.project_analyses(project_id);
