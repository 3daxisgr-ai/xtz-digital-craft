
-- Rename table
ALTER TABLE public.quote_requests RENAME TO quotes;

-- Migrate existing status values to new labels
UPDATE public.quotes SET status = CASE
  WHEN status = 'new' THEN 'New'
  WHEN status = 'in_progress' THEN 'In Progress'
  WHEN status = 'done' THEN 'Completed'
  WHEN status = 'quoted' THEN 'Quoted'
  ELSE 'New'
END;

-- Update default and add check constraint
ALTER TABLE public.quotes ALTER COLUMN status SET DEFAULT 'New';
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_status_check
  CHECK (status IN ('New','In Progress','Quoted','Completed'));

-- Update foreign key from admin_notifications.quote_id (still references quote ids; no fk constraint exists, so nothing to do)

-- Re-grant (table rename keeps grants but be explicit)
GRANT INSERT ON public.quotes TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.quotes TO service_role;
