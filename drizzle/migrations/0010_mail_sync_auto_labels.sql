-- Last value the automation wrote to a Notion classification field. If Notion now shows a
-- different value, a person changed it and the automation leaves it alone. Service-role only.
CREATE TABLE public.mail_sync_auto_labels (
  target text PRIMARY KEY,
  value text NOT NULL,
  reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mail_sync_auto_labels TO service_role;
REVOKE ALL ON public.mail_sync_auto_labels FROM anon, authenticated;
ALTER TABLE public.mail_sync_auto_labels ENABLE ROW LEVEL SECURITY;