
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO postgres, service_role;

-- Recreate policies to reference private.has_role
DROP POLICY IF EXISTS "Customers read their own orders" ON public.orders;
CREATE POLICY "Customers read their own orders" ON public.orders
FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Files visible per order ownership and visibility" ON public.order_files;
CREATE POLICY "Files visible per order ownership and visibility" ON public.order_files
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR (visibility = 'customer'::file_visibility AND EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_files.order_id AND o.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Events visible per order ownership" ON public.order_events;
CREATE POLICY "Events visible per order ownership" ON public.order_events
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR (visibility = 'customer'::file_visibility AND EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_events.order_id AND o.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Messages read per order ownership" ON public.order_messages;
CREATE POLICY "Messages read per order ownership" ON public.order_messages
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_messages.order_id AND o.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "order-files customer read" ON storage.objects;
CREATE POLICY "order-files customer read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'order-files'
  AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.order_files f
      JOIN public.orders o ON o.id = f.order_id
      WHERE f.file_path = storage.objects.name
        AND f.visibility = 'customer'::file_visibility
        AND o.user_id = auth.uid()
    )
  )
);

-- Drop the public-schema function now that nothing references it
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
