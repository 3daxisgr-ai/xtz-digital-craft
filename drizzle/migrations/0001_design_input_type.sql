ALTER TABLE public.material_estimates ADD COLUMN IF NOT EXISTS design_input_type text, ADD COLUMN IF NOT EXISTS uncertainty text;

CREATE TABLE public.design_input_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  submission_id uuid,
  category text,
  design_input_type text NOT NULL CHECK (design_input_type IN ('file','photo','ai_design')),
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  customer_description text,
  supplied_dimensions text,
  ai_output jsonb,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  geometry_source text,
  uncertainty text,
  analyzed_file_count integer NOT NULL DEFAULT 0,
  model text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.design_input_analyses TO service_role;
ALTER TABLE public.design_input_analyses ENABLE ROW LEVEL SECURITY;
CREATE INDEX design_input_analyses_order_idx ON public.design_input_analyses(order_id);