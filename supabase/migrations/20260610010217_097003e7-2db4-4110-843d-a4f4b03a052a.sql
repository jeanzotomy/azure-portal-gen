
CREATE POLICY "Admins and HR can upload direct message attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'direct-message-attachments'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'hr'::app_role))
);

CREATE POLICY "Admins and HR can read their direct message attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'direct-message-attachments'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'hr'::app_role))
);

CREATE POLICY "Admins and HR can delete direct message attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'direct-message-attachments'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'hr'::app_role))
);
