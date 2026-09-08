ALTER TABLE public.quote_documents DROP CONSTRAINT IF EXISTS quote_documents_status_chk;
ALTER TABLE public.quote_documents ADD CONSTRAINT quote_documents_status_chk CHECK (status = ANY (ARRAY[
  'draft','generated','sent','viewed','accepted','rejected',
  'accepted_by_customer','rejected_by_customer','expired','converted','cancelled','replaced'
]));

ALTER TABLE public.quote_documents
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_thread_id text,
  ADD COLUMN IF NOT EXISTS source_message_id text;

CREATE INDEX IF NOT EXISTS quote_documents_status_idx ON public.quote_documents (status);
CREATE INDEX IF NOT EXISTS quote_documents_created_at_idx ON public.quote_documents (created_at DESC);
CREATE INDEX IF NOT EXISTS quote_documents_source_thread_idx ON public.quote_documents (source_thread_id);