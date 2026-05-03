-- Helper: secure function returning current user's email (avoids exposing auth.users in policies)
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT LOWER(email) FROM auth.users WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated;

-- Replace the previously added policy with one using the helper
DROP POLICY IF EXISTS "Users view applications matching their email" ON public.job_applications;
CREATE POLICY "Users view applications matching their email"
ON public.job_applications
FOR SELECT
TO authenticated
USING (
  user_id IS NULL
  AND LOWER(email) = public.current_user_email()
);

-- Same coverage for onboarding_processes
CREATE POLICY "Users view onboarding matching their email"
ON public.onboarding_processes
FOR SELECT
TO authenticated
USING (
  user_id IS NULL
  AND LOWER(candidate_email) = public.current_user_email()
);