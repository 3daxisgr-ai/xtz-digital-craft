-- 1. Orders: remove customer row-level access to the full table (incl. internal_notes)
DROP POLICY IF EXISTS "Customers read their own orders" ON public.orders;

CREATE POLICY "Admins read all orders"
ON public.orders FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Customer-safe projection of orders
CREATE OR REPLACE VIEW public.customer_orders
WITH (security_invoker = off) AS
SELECT
  o.id, o.order_code, o.user_id, o.customer_name, o.customer_email, o.customer_phone,
  o.company, o.service, o.material, o.quantity, o.dimensions, o.message, o.status,
  o.quote_price, o.currency, o.courier, o.tracking_number, o.tracking_url,
  o.estimated_delivery, o.metadata, o.created_at, o.updated_at, o.due_date
FROM public.orders o
WHERE o.user_id = auth.uid();

GRANT SELECT ON public.customer_orders TO authenticated;

-- 2. project_analyses: admin-only on the base table
DROP POLICY IF EXISTS "read own analyses or admin" ON public.project_analyses;

CREATE POLICY "Admins read analyses"
ON public.project_analyses FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Customer-safe projection: no costs, margins, AI notes or risk data
CREATE OR REPLACE VIEW public.customer_order_estimates
WITH (security_invoker = off) AS
SELECT
  pa.id, pa.order_id, pa.file_name, pa.service,
  pa.recommended_material, pa.estimated_print_hours,
  pa.quote_price_eur, pa.locked_until, pa.created_at
FROM public.project_analyses pa
JOIN public.orders o ON o.id = pa.order_id
WHERE o.user_id = auth.uid();

GRANT SELECT ON public.customer_order_estimates TO authenticated;