-- Restore row policies, enforce column-level restrictions instead
DROP POLICY IF EXISTS "Admins read all orders" ON public.orders;
CREATE POLICY "Customers read their own orders"
ON public.orders FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins read analyses" ON public.project_analyses;
CREATE POLICY "read own analyses or admin"
ON public.project_analyses FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = project_analyses.order_id AND o.user_id = auth.uid())
);

-- Column-level privileges: signed-in users may only read customer-safe columns
REVOKE SELECT ON public.orders FROM authenticated;
GRANT SELECT (
  id, order_code, user_id, customer_name, customer_email, customer_phone, company,
  service, material, quantity, dimensions, message, status, quote_price, currency,
  courier, tracking_number, tracking_url, estimated_delivery, metadata,
  created_at, updated_at, due_date
) ON public.orders TO authenticated;

REVOKE SELECT ON public.project_analyses FROM authenticated;
GRANT SELECT (
  id, order_id, file_name, service, recommended_material,
  estimated_print_hours, quote_price_eur, locked_until, created_at
) ON public.project_analyses TO authenticated;

GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.project_analyses TO service_role;

-- Views now run with the querying user's own permissions
DROP VIEW IF EXISTS public.customer_orders;
CREATE VIEW public.customer_orders WITH (security_invoker = on) AS
SELECT
  o.id, o.order_code, o.user_id, o.customer_name, o.customer_email, o.customer_phone,
  o.company, o.service, o.material, o.quantity, o.dimensions, o.message, o.status,
  o.quote_price, o.currency, o.courier, o.tracking_number, o.tracking_url,
  o.estimated_delivery, o.metadata, o.created_at, o.updated_at, o.due_date
FROM public.orders o
WHERE o.user_id = auth.uid();
GRANT SELECT ON public.customer_orders TO authenticated;

DROP VIEW IF EXISTS public.customer_order_estimates;
CREATE VIEW public.customer_order_estimates WITH (security_invoker = on) AS
SELECT
  pa.id, pa.order_id, pa.file_name, pa.service, pa.recommended_material,
  pa.estimated_print_hours, pa.quote_price_eur, pa.locked_until, pa.created_at
FROM public.project_analyses pa
JOIN public.orders o ON o.id = pa.order_id
WHERE o.user_id = auth.uid();
GRANT SELECT ON public.customer_order_estimates TO authenticated;