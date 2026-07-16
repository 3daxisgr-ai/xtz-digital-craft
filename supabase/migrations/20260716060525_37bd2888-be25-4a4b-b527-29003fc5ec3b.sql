
ALTER TABLE public.project_analyses
  ADD COLUMN IF NOT EXISTS geometry_hash text,
  ADD COLUMN IF NOT EXISTS quote_fingerprint text,
  ADD COLUMN IF NOT EXISTS pricing_engine_version text,
  ADD COLUMN IF NOT EXISTS use_type text,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS material_cost_eur numeric(12,4),
  ADD COLUMN IF NOT EXISTS machine_cost_eur numeric(12,4),
  ADD COLUMN IF NOT EXISTS preparation_fee_eur numeric(12,4),
  ADD COLUMN IF NOT EXISTS internal_cost_eur numeric(12,4),
  ADD COLUMN IF NOT EXISTS profit_eur numeric(12,4),
  ADD COLUMN IF NOT EXISTS margin_pct numeric(6,3);

CREATE INDEX IF NOT EXISTS project_analyses_quote_fp_idx
  ON public.project_analyses(quote_fingerprint)
  WHERE quote_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS project_analyses_geometry_hash_idx
  ON public.project_analyses(geometry_hash)
  WHERE geometry_hash IS NOT NULL;

ALTER TABLE public.order_files
  ADD COLUMN IF NOT EXISTS geometry_hash text;

CREATE INDEX IF NOT EXISTS order_files_geometry_hash_idx
  ON public.order_files(geometry_hash)
  WHERE geometry_hash IS NOT NULL;
