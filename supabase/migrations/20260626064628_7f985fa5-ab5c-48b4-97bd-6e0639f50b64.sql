
-- Storage RLS for order-files bucket. All writes happen through service-role server functions.
-- Allow authenticated users to read objects in order-files only for orders they own.
CREATE POLICY "order-files customer read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'order-files'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.order_files f
      JOIN public.orders o ON o.id = f.order_id
      WHERE f.file_path = storage.objects.name
        AND f.visibility = 'customer'
        AND o.user_id = auth.uid()
    )
  )
);
