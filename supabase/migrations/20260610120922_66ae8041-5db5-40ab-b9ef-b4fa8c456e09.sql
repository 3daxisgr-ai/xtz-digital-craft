ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';
CREATE INDEX IF NOT EXISTS quote_requests_status_idx ON public.quote_requests(status);
CREATE INDEX IF NOT EXISTS quote_requests_created_at_idx ON public.quote_requests(created_at DESC);