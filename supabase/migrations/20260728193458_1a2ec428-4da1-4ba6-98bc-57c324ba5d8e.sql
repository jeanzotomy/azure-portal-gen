-- departments: staff-only read
DROP POLICY IF EXISTS "Anyone authenticated can view departments" ON public.departments;
CREATE POLICY "Staff can view departments"
ON public.departments
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.has_role(auth.uid(), 'gestionnaire')
  OR public.has_role(auth.uid(), 'agent')
  OR public.has_role(auth.uid(), 'comptable')
  OR public.has_role(auth.uid(), 'onboarding')
);

-- sectors: staff-only read
DROP POLICY IF EXISTS "Anyone authenticated can view sectors" ON public.sectors;
CREATE POLICY "Staff can view sectors"
ON public.sectors
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr')
  OR public.has_role(auth.uid(), 'gestionnaire')
  OR public.has_role(auth.uid(), 'agent')
  OR public.has_role(auth.uid(), 'comptable')
  OR public.has_role(auth.uid(), 'onboarding')
);

-- site_settings: only allow-listed public keys are readable without admin rights
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
CREATE POLICY "Public can read public site settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (key IN ('social_channels', 'nav.pricing_visible'));

CREATE POLICY "Admins can read all site settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));