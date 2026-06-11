ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_service_catalog_published ON public.service_catalog(published) WHERE published = true;
GRANT SELECT ON public.service_catalog TO anon;
DROP POLICY IF EXISTS "Public can view published catalog" ON public.service_catalog;
CREATE POLICY "Public can view published catalog" ON public.service_catalog
  FOR SELECT
  TO anon, authenticated
  USING (published = true AND active = true);