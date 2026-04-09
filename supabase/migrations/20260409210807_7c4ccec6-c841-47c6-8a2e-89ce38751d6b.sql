-- Allow agents to view contact requests
CREATE POLICY "Agents can view all contact requests"
ON public.contact_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'agent'::app_role));
