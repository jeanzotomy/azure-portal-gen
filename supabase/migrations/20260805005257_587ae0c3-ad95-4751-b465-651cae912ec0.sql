DROP POLICY IF EXISTS "Public can read public site settings" ON public.site_settings;
CREATE POLICY "Public can read public site settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (key IN ('social_channels', 'nav.pricing_visible', 'nav.trainings_visible'));