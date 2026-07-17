
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text NOT NULL,
  website_url text,
  display_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT ON public.partners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published partners"
ON public.partners FOR SELECT
USING (published = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage partners"
ON public.partners FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_partners_updated_at
BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Public can read partner logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'partner-logos');

CREATE POLICY "Admins can upload partner logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'partner-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update partner logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'partner-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete partner logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'partner-logos' AND has_role(auth.uid(), 'admin'::app_role));
