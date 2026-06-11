
-- 1) Stop publishing admin_notifications via Postgres CDC.
-- Admin dashboard uses a server-side broadcast channel (no table CDC needed).
ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_notifications;

-- 2) Drop the duplicate unrestricted upload policy and replace the remaining
--    one with a tightened version that restricts uploads to the two folder
--    prefixes used by the public forms.
DROP POLICY IF EXISTS "Public can upload to submission-files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload submission files" ON storage.objects;

CREATE POLICY "Upload to submission-files restricted folders"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'submission-files'
    AND (
      (storage.foldername(name))[1] = 'inquiry'
      OR (storage.foldername(name))[1] = '3dp'
    )
  );
