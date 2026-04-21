CREATE POLICY "Gestionnaires can manage service clients"
ON public.service_clients FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gestionnaire'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));

CREATE POLICY "Gestionnaires can manage service catalog"
ON public.service_catalog FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gestionnaire'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));

CREATE POLICY "Gestionnaires can manage service invoices"
ON public.service_invoices FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gestionnaire'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));

CREATE POLICY "Gestionnaires can manage invoice items"
ON public.service_invoice_items FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gestionnaire'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));

CREATE POLICY "Gestionnaires manage payment methods"
ON public.payment_methods FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gestionnaire'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));