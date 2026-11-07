-- L'équipe marketing (lecture/écriture des prospects) inclut désormais les commerciaux
CREATE OR REPLACE FUNCTION public.is_marketing_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id,'admin') OR public.has_role(_user_id,'gestionnaire') OR public.has_role(_user_id,'agent') OR public.has_role(_user_id,'commercial')
$$;

-- Propositions commerciales : les commerciaux les gèrent comme les agents
DROP POLICY "Sales staff manage proposals" ON public.commercial_proposals;
CREATE POLICY "Sales staff manage proposals"
ON public.commercial_proposals
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire') OR public.has_role(auth.uid(), 'agent') OR public.has_role(auth.uid(), 'commercial'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire') OR public.has_role(auth.uid(), 'agent') OR public.has_role(auth.uid(), 'commercial'));

-- Clients : les commerciaux gèrent la fiche client
CREATE POLICY "Commercials can manage service clients"
ON public.service_clients
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'commercial'))
WITH CHECK (public.has_role(auth.uid(), 'commercial'));

-- Demandes de devis : les commerciaux les lisent et les traitent
DROP POLICY "Staff can read quotes" ON public.quote_requests;
CREATE POLICY "Staff can read quotes"
ON public.quote_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire') OR public.has_role(auth.uid(), 'comptable') OR public.has_role(auth.uid(), 'commercial'));

DROP POLICY "Staff can update quotes" ON public.quote_requests;
CREATE POLICY "Staff can update quotes"
ON public.quote_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire') OR public.has_role(auth.uid(), 'comptable') OR public.has_role(auth.uid(), 'commercial'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire') OR public.has_role(auth.uid(), 'comptable') OR public.has_role(auth.uid(), 'commercial'));