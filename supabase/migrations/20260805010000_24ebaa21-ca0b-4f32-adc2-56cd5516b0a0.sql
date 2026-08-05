DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;
CREATE POLICY "Email assets images are publicly readable"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'email-assets'
  AND name IS NOT NULL
  AND lower(name) ~ '\.(png|jpe?g|gif|webp|svg|avif|ico)$'
);