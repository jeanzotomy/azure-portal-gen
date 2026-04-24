CREATE POLICY "Admins can delete email send log"
ON public.email_send_log
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestionnaire'::app_role)
);