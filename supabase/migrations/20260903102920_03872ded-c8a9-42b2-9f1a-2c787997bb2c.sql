DROP POLICY IF EXISTS "Admins can view email intake" ON public.email_order_intake;
CREATE POLICY "Admins can view email intake"
  ON public.email_order_intake FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));