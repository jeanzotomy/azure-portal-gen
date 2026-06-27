
-- 1) contact_email_otps: explicit deny policy for anon/authenticated
DROP POLICY IF EXISTS "Deny all client access to contact_email_otps" ON public.contact_email_otps;
CREATE POLICY "Deny all client access to contact_email_otps"
  ON public.contact_email_otps
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.contact_email_otps FROM anon, authenticated;

-- 2) suppressed_emails: allow admins to read
DROP POLICY IF EXISTS "Admins can view suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Admins can view suppressed emails"
  ON public.suppressed_emails
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.suppressed_emails TO authenticated;

-- 3) trainings.quiz: revoke column-level SELECT from anon/authenticated
REVOKE SELECT (quiz) ON public.trainings FROM anon, authenticated;
