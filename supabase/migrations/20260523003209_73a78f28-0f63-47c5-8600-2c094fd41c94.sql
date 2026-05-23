-- 1. Make signatures bucket private
UPDATE storage.buckets SET public = false WHERE id = 'signatures';

-- 2. Replace public-read policy with owner+staff scoped policy
DROP POLICY IF EXISTS "Signatures are publicly readable" ON storage.objects;

CREATE POLICY "Owner and staff read signatures"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'signatures'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'comptable'::app_role)
      OR has_role(auth.uid(), 'gestionnaire'::app_role)
      OR has_role(auth.uid(), 'hr'::app_role)
    )
  );

-- 3. Backfill: convert any previously stored public URL into the storage path
UPDATE public.profiles
SET signature_url = regexp_replace(
  split_part(signature_url, '?', 1),
  '^https?://[^/]+/storage/v1/object/(public|sign)/signatures/',
  ''
)
WHERE signature_url LIKE 'http%/storage/v1/object/%/signatures/%';

-- 4. Grant HR role read access to CV files
CREATE POLICY "HR read all CVs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cv-applications'
    AND has_role(auth.uid(), 'hr'::app_role)
  );

-- 5. Add UPDATE policy for project-files (owner only)
CREATE POLICY "Users can update own project files storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'project-files'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );