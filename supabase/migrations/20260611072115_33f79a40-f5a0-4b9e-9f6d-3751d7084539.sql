
REVOKE SELECT ON public.admin_notifications FROM anon, authenticated;

DROP POLICY IF EXISTS "No client access to admin_notifications" ON public.admin_notifications;

CREATE POLICY "Deny client reads on admin_notifications"
  ON public.admin_notifications
  FOR SELECT
  TO anon, authenticated
  USING (false);
