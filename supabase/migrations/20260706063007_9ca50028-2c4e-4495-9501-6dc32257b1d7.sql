DROP POLICY IF EXISTS "read blocks" ON public.machine_calendar_blocks;
CREATE POLICY "admins read blocks" ON public.machine_calendar_blocks
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.machine_calendar_blocks FROM anon;