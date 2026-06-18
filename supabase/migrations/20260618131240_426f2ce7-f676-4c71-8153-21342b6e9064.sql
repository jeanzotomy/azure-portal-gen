-- Users manage files under <auth.uid()>/...
CREATE POLICY "user-documents: owner can read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "user-documents: owner can insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "user-documents: owner can update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'user-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "user-documents: owner can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- HR / Admin can read any user's documents
CREATE POLICY "user-documents: staff can read all"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'hr'::app_role)
    )
  );