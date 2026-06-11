
CREATE OR REPLACE FUNCTION public.is_client_for_assigned_invoice(_client_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.service_invoices
    WHERE client_id = _client_id AND assigned_user_id = _user_id
  );
$$;

DROP POLICY IF EXISTS "Assigned user can view invoice client" ON public.service_clients;

CREATE POLICY "Assigned user can view invoice client"
ON public.service_clients
FOR SELECT
USING (public.is_client_for_assigned_invoice(id, auth.uid()));
