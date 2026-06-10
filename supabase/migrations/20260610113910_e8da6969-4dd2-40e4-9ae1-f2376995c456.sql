
CREATE POLICY "Anyone can upload submission files"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'submission-files');
