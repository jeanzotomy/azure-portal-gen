REVOKE INSERT, UPDATE, DELETE ON public.partners FROM anon;
GRANT SELECT ON public.partners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;

DROP POLICY IF EXISTS "Anyone can read published partners" ON public.partners;
DROP POLICY IF EXISTS "Admins manage partners" ON public.partners;

CREATE POLICY "Anyone can read published partners"
ON public.partners
FOR SELECT
TO anon, authenticated
USING (published = true);

CREATE POLICY "Admins manage partners"
ON public.partners
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));