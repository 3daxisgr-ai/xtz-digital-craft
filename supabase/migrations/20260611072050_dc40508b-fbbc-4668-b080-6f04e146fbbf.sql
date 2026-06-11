
CREATE TABLE public.admin_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_notifications TO service_role;
-- Realtime needs to deliver row payloads; gate access strictly via RLS.
GRANT SELECT ON public.admin_notifications TO anon, authenticated;

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Deny all client reads/writes; admin dashboard uses service-role server functions.
CREATE POLICY "No client access to admin_notifications"
  ON public.admin_notifications
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE INDEX admin_notifications_unread_idx
  ON public.admin_notifications (created_at DESC)
  WHERE read = false;

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
