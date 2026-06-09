
CREATE POLICY "Read own certificate file"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'certificates' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'hr'::app_role)
      OR public.has_role(auth.uid(), 'gestionnaire'::app_role)
    )
  );

CREATE POLICY "Service role manages certificate files"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'certificates') WITH CHECK (bucket_id = 'certificates');
