-- Backfill: sync AI quote prices to orders, and create production jobs for orders that already have an analysis but no job.
UPDATE public.orders o
SET quote_price = a.quote_price_eur
FROM (
  SELECT DISTINCT ON (order_id) order_id, quote_price_eur, estimated_print_hours, recommended_material, printability_score, id
  FROM public.project_analyses
  WHERE order_id IS NOT NULL AND quote_price_eur IS NOT NULL
  ORDER BY order_id, created_at DESC
) a
WHERE o.id = a.order_id
  AND (o.quote_price IS NULL OR o.quote_price < a.quote_price_eur);

INSERT INTO public.production_jobs (order_id, analysis_id, estimated_hours, material_code, state, risk)
SELECT a.order_id, a.id, COALESCE(a.estimated_print_hours, 4), a.recommended_material,
       'queued'::production_job_state,
       (CASE WHEN COALESCE(a.printability_score, 100) < 60 THEN 'high'
             WHEN COALESCE(a.printability_score, 100) < 80 THEN 'medium'
             ELSE 'low' END)::production_risk
FROM (
  SELECT DISTINCT ON (order_id) id, order_id, estimated_print_hours, recommended_material, printability_score
  FROM public.project_analyses
  WHERE order_id IS NOT NULL
  ORDER BY order_id, created_at DESC
) a
WHERE NOT EXISTS (SELECT 1 FROM public.production_jobs pj WHERE pj.order_id = a.order_id);