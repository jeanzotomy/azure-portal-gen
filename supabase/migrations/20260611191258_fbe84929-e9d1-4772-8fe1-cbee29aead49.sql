
-- Allow assigned user to read invoice items, client, and payment methods linked to their assigned invoices

CREATE POLICY "Assigned user can view invoice items"
ON public.service_invoice_items
FOR SELECT
USING (
  invoice_id IN (
    SELECT id FROM public.service_invoices WHERE assigned_user_id = auth.uid()
  )
);

CREATE POLICY "Assigned user can view invoice client"
ON public.service_clients
FOR SELECT
USING (
  id IN (
    SELECT client_id FROM public.service_invoices WHERE assigned_user_id = auth.uid()
  )
);

CREATE POLICY "Assigned user can view invoice payment methods"
ON public.payment_methods
FOR SELECT
USING (
  active = true AND EXISTS (
    SELECT 1 FROM public.service_invoices si
    WHERE si.assigned_user_id = auth.uid()
      AND payment_methods.id = ANY(si.payment_method_ids)
  )
);
