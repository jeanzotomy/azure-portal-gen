
GRANT SELECT ON public.verify_attempts TO authenticated;

CREATE POLICY "Admins can read verify attempts"
  ON public.verify_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
