
-- Material inventory status system + prep for future inventory fields.
-- Adds status enum-style column + minimum stock + supplier metadata.
-- Also adds a factory_settings toggle to hide out-of-stock materials on quote page.

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_stock',
  ADD COLUMN IF NOT EXISTS minimum_stock_kg numeric(10,3),
  ADD COLUMN IF NOT EXISTS supplier text,
  ADD COLUMN IF NOT EXISTS last_restocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS internal_notes text;

ALTER TABLE public.materials
  DROP CONSTRAINT IF EXISTS materials_status_check;
ALTER TABLE public.materials
  ADD CONSTRAINT materials_status_check
  CHECK (status IN ('in_stock','low_stock','out_of_stock','disabled'));

-- Backfill status from current stock_kg / active
UPDATE public.materials SET status =
  CASE
    WHEN active = false THEN 'disabled'
    WHEN COALESCE(stock_kg,0) <= 0 THEN 'out_of_stock'
    WHEN COALESCE(stock_kg,0) < 2 THEN 'low_stock'
    ELSE 'in_stock'
  END
WHERE status = 'in_stock';

ALTER TABLE public.factory_settings
  ADD COLUMN IF NOT EXISTS hide_out_of_stock_materials boolean NOT NULL DEFAULT false;
