-- 1. email_send_state : verrouiller aux fonctions serveur uniquement
REVOKE ALL ON public.email_send_state FROM anon, authenticated;
GRANT ALL ON public.email_send_state TO service_role;

DROP POLICY IF EXISTS "Service role can manage send state" ON public.email_send_state;
CREATE POLICY "Service role can manage send state"
ON public.email_send_state
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. partner-logos : lecture publique limitée aux fichiers image
DROP POLICY IF EXISTS "Public can read partner logos" ON storage.objects;
CREATE POLICY "Public can read partner logos"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'partner-logos'
  AND lower(storage.extension(name)) IN ('png','jpg','jpeg','webp','svg','gif','avif')
);