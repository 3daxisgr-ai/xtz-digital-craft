DELETE FROM public.project_analyses WHERE dfm_score <= 5;
UPDATE public.orders SET quote_price = NULL WHERE order_code = 'TR-2026-0001' AND (quote_price IS NULL OR quote_price <= 15);
