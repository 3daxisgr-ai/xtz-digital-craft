
-- Add priority + due date to orders
DO $$ BEGIN
  CREATE TYPE public.order_priority AS ENUM ('low','normal','high','urgent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS priority public.order_priority NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS due_date date;

-- Add missing status values (idempotent)
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'packaging';
EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'completed';
EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN
  ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'rejected';
EXCEPTION WHEN others THEN null; END $$;

-- Enrich timeline events
ALTER TABLE public.order_events
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS color_tag text;

-- Activity log (admin actions)
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL DEFAULT 'admin',
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_activity_log TO service_role;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
-- No public/auth policies: only service_role (server functions) touches this table.

CREATE INDEX IF NOT EXISTS idx_activity_log_created ON public.admin_activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_priority ON public.orders (priority);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders (created_at DESC);
