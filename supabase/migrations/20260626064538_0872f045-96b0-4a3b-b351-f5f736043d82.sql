
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

CREATE TYPE public.order_status AS ENUM (
  'quote_received',
  'engineering_review',
  'quote_sent',
  'awaiting_approval',
  'payment_received',
  'production',
  'quality_inspection',
  'ready_for_shipping',
  'shipped',
  'delivered',
  'cancelled'
);

CREATE TYPE public.order_source AS ENUM ('inquiry', '3dp_quote', 'start', 'admin');
CREATE TYPE public.file_visibility AS ENUM ('customer', 'admin');
CREATE TYPE public.actor_role AS ENUM ('customer', 'admin', 'system');

-- =========================================================
-- shared updated_at helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  company text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- USER ROLES (separate table per security rule)
-- =========================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Security-definer role check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- =========================================================
-- ORDERS
-- =========================================================
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  company text,

  source public.order_source NOT NULL DEFAULT 'inquiry',
  service text,
  material text,
  quantity text,
  dimensions text,
  message text,

  status public.order_status NOT NULL DEFAULT 'quote_received',
  quote_price numeric(12,2),
  currency text NOT NULL DEFAULT 'EUR',

  courier text,
  tracking_number text,
  tracking_url text,
  estimated_delivery date,

  invoice_file_path text,
  internal_notes text,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id        ON public.orders(user_id);
CREATE INDEX idx_orders_email          ON public.orders(lower(customer_email));
CREATE INDEX idx_orders_status         ON public.orders(status);
CREATE INDEX idx_orders_created_at     ON public.orders(created_at DESC);

GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers read their own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Order code generator: TR-YYYY-NNNN
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  yr text;
  seq int;
  code text;
BEGIN
  IF NEW.order_code IS NOT NULL THEN RETURN NEW; END IF;
  yr := to_char(now(), 'YYYY');
  LOOP
    SELECT COALESCE(MAX(CAST(split_part(order_code, '-', 3) AS int)), 0) + 1
      INTO seq
      FROM public.orders
      WHERE order_code LIKE 'TR-' || yr || '-%';
    code := 'TR-' || yr || '-' || lpad(seq::text, 4, '0');
    BEGIN
      NEW.order_code := code;
      RETURN NEW;
    END;
  END LOOP;
END;
$$;

CREATE TRIGGER trg_orders_code BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_code();

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- ORDER FILES
-- =========================================================
CREATE TABLE public.order_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  size_bytes bigint,
  uploaded_by public.actor_role NOT NULL DEFAULT 'customer',
  visibility public.file_visibility NOT NULL DEFAULT 'customer',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_files_order ON public.order_files(order_id);

GRANT SELECT ON public.order_files TO authenticated;
GRANT ALL ON public.order_files TO service_role;
ALTER TABLE public.order_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Files visible per order ownership and visibility" ON public.order_files
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      visibility = 'customer'
      AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
    )
  );

-- =========================================================
-- ORDER EVENTS (timeline)
-- =========================================================
CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  actor public.actor_role NOT NULL DEFAULT 'system',
  visibility public.file_visibility NOT NULL DEFAULT 'customer',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_events_order ON public.order_events(order_id, created_at);

GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events visible per order ownership" ON public.order_events
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      visibility = 'customer'
      AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
    )
  );

-- Status-change auto timeline
CREATE OR REPLACE FUNCTION public.orders_log_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_events (order_id, event_type, title, actor, visibility, payload)
    VALUES (NEW.id, 'order_created', 'Quote Submitted', 'system', 'customer',
            jsonb_build_object('status', NEW.status));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_events (order_id, event_type, title, actor, visibility, payload)
    VALUES (NEW.id, 'status_changed',
            'Status: ' || replace(initcap(replace(NEW.status::text,'_',' ')),'_',' '),
            'admin', 'customer',
            jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_status_event
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_log_status_change();

-- =========================================================
-- ORDER MESSAGES
-- =========================================================
CREATE TABLE public.order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_role public.actor_role NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_messages_order ON public.order_messages(order_id, created_at);

GRANT SELECT, INSERT ON public.order_messages TO authenticated;
GRANT ALL ON public.order_messages TO service_role;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages read per order ownership" ON public.order_messages
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

CREATE POLICY "Customers can post messages on own orders" ON public.order_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    from_role = 'customer'
    AND author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

-- =========================================================
-- Auto-create profile + claim orders on signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (user_id) DO NOTHING;

  -- default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;

  -- admin seed
  IF lower(NEW.email) = 'info@toreo.gr' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  -- claim previously-submitted orders by email
  UPDATE public.orders
     SET user_id = NEW.id
   WHERE user_id IS NULL
     AND lower(customer_email) = lower(NEW.email);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- If admin email already exists in auth.users, grant admin now
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) = '3daxis.gr@gmail.com'
ON CONFLICT DO NOTHING;
