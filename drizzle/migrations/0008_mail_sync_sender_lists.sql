ALTER TABLE public.mail_sync_settings
  ADD COLUMN ignore_senders text[] NOT NULL DEFAULT ARRAY['xometry.de','facebookmail.com','facebook.com','instagram.com','pcbway.com','treatstock.com','resend.com','resend.dev','notion.so','notion.com','readdle.com','lovable.cloud','price4parts.com','tiiny.host','zendocs.com','fastsource.in','inglobe.gr','ianap.gr','tec-do.com','register.it']::text[],
  ADD COLUMN internal_senders text[] NOT NULL DEFAULT ARRAY['3daxis.gr@gmail.com','flopy2pc@gmail.com']::text[];
COMMENT ON COLUMN public.mail_sync_settings.ignore_senders IS 'Domains or addresses never treated as customer requests (platform notifications, marketing, solicitations). Admin-editable.';
COMMENT ON COLUMN public.mail_sync_settings.internal_senders IS 'TOREO staff/test addresses: their emails and website test submissions are never imported as customer requests.';
REVOKE ALL ON public.mail_sync_settings FROM anon, authenticated;