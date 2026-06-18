DROP POLICY IF EXISTS "Anyone can insert submissions" ON public.submissions;
DROP POLICY IF EXISTS "Anyone can insert quote requests" ON public.quotes;
REVOKE INSERT ON public.submissions FROM anon, authenticated;
REVOKE INSERT ON public.quotes FROM anon, authenticated;