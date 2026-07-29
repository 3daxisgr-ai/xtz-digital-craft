CREATE POLICY proformas_bucket_admin_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'proformas' AND public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (bucket_id = 'proformas' AND public.has_role(auth.uid(),'admin'::app_role));

REVOKE EXECUTE ON FUNCTION public.next_proforma_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_proforma_number() TO service_role;