ALTER TABLE public.factory_settings ADD COLUMN IF NOT EXISTS material_markup_pct numeric NOT NULL DEFAULT 30;

CREATE TABLE public.material_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL,
  submission_id uuid,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  service text,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_output jsonb,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  geometry_source text NOT NULL DEFAULT 'customer',
  geometry jsonb NOT NULL DEFAULT '{}'::jsonb,
  material_code text,
  material_label text,
  thickness_mm numeric,
  quantity integer NOT NULL DEFAULT 1,
  density_g_cm3 numeric,
  kg numeric,
  kg_min numeric,
  kg_max numeric,
  cost_per_kg numeric,
  material_cost numeric,
  markup_pct numeric,
  price numeric,
  price_min numeric,
  price_max numeric,
  mode text NOT NULL DEFAULT 'needs_info',
  confidence numeric,
  model text,
  ip_hash text,
  customer_dto jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX material_estimates_fp_idx ON public.material_estimates(fingerprint);
CREATE INDEX material_estimates_order_idx ON public.material_estimates(order_id);
CREATE INDEX material_estimates_ip_idx ON public.material_estimates(ip_hash, created_at);

GRANT ALL ON public.material_estimates TO service_role;
ALTER TABLE public.material_estimates ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated: internal costs are server-only (service role).

CREATE TRIGGER material_estimates_updated_at BEFORE UPDATE ON public.material_estimates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();