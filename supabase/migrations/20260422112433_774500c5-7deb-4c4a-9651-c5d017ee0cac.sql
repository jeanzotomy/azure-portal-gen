
-- 1) Allow anonymous job applications: make user_id nullable
ALTER TABLE public.job_applications ALTER COLUMN user_id DROP NOT NULL;

-- 2) Add public INSERT policy (anyone can submit applications)
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.job_applications;
CREATE POLICY "Anyone can submit applications"
ON public.job_applications
FOR INSERT
TO public
WITH CHECK (true);

-- 3) Storage: allow anonymous CV upload under 'public/' folder of cv-applications bucket
DROP POLICY IF EXISTS "Anyone can upload public CVs" ON storage.objects;
CREATE POLICY "Anyone can upload public CVs"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'cv-applications'
  AND (storage.foldername(name))[1] = 'public'
);
