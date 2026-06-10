-- Allow uploads from the public forms (anon + authenticated), restricted to the submission-files bucket
DROP POLICY IF EXISTS "Public can upload to submission-files" ON storage.objects;
CREATE POLICY "Public can upload to submission-files"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'submission-files');

-- Explicitly deny SELECT/UPDATE/DELETE for anon and authenticated.
-- service_role bypasses RLS, so admin server code keeps full access.
DROP POLICY IF EXISTS "Deny public read of submission-files" ON storage.objects;
CREATE POLICY "Deny public read of submission-files"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id <> 'submission-files');

DROP POLICY IF EXISTS "Deny public update of submission-files" ON storage.objects;
CREATE POLICY "Deny public update of submission-files"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id <> 'submission-files');

DROP POLICY IF EXISTS "Deny public delete of submission-files" ON storage.objects;
CREATE POLICY "Deny public delete of submission-files"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id <> 'submission-files');