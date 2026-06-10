
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  surname TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  service TEXT,
  material TEXT,
  stage TEXT,
  dimensions TEXT,
  quantity TEXT,
  weight_g NUMERIC,
  print_hours NUMERIC,
  estimated_price NUMERIC,
  message TEXT,
  file_path TEXT,
  file_name TEXT,
  file_url TEXT,
  metadata JSONB,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.submissions TO anon;
GRANT SELECT, INSERT ON public.submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (public contact/quote forms)
CREATE POLICY "Anyone can insert submissions"
  ON public.submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No public reads; only service role (used by server functions) can read
CREATE POLICY "Service role can read submissions"
  ON public.submissions
  FOR SELECT
  TO service_role
  USING (true);
