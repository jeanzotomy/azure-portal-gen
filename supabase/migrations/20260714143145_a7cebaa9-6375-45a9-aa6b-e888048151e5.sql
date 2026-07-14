-- Allow admin and HR to update certificates (needed for revoke/restore action)
CREATE POLICY "Admin and HR can update certificates"
ON public.training_certificates
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));