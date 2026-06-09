
-- 1. Tighten candidate UPDATE policy on onboarding_assigned_trainings with WITH CHECK
DROP POLICY IF EXISTS "Candidates mark own training completed" ON public.onboarding_assigned_trainings;

CREATE POLICY "Candidates mark own training completed"
ON public.onboarding_assigned_trainings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.onboarding_processes p
    WHERE p.id = onboarding_assigned_trainings.process_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.onboarding_processes p
    WHERE p.id = onboarding_assigned_trainings.process_id
      AND p.user_id = auth.uid()
  )
  -- Lock immutable fields: candidates cannot change identity of assignment
  AND process_id  = (SELECT oat.process_id  FROM public.onboarding_assigned_trainings oat WHERE oat.id = onboarding_assigned_trainings.id)
  AND training_id = (SELECT oat.training_id FROM public.onboarding_assigned_trainings oat WHERE oat.id = onboarding_assigned_trainings.id)
  AND assigned_by IS NOT DISTINCT FROM (SELECT oat.assigned_by FROM public.onboarding_assigned_trainings oat WHERE oat.id = onboarding_assigned_trainings.id)
  AND assigned_at IS NOT DISTINCT FROM (SELECT oat.assigned_at FROM public.onboarding_assigned_trainings oat WHERE oat.id = onboarding_assigned_trainings.id)
  AND source      IS NOT DISTINCT FROM (SELECT oat.source      FROM public.onboarding_assigned_trainings oat WHERE oat.id = onboarding_assigned_trainings.id)
);

-- 2. Allow clients to view their own service invoices
CREATE POLICY "Clients can view own service invoices"
ON public.service_invoices
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM public.service_clients WHERE user_id = auth.uid()
  )
);

-- 3. Allow clients to view line items on their own service invoices
CREATE POLICY "Clients can view own service invoice items"
ON public.service_invoice_items
FOR SELECT
TO authenticated
USING (
  invoice_id IN (
    SELECT si.id FROM public.service_invoices si
    JOIN public.service_clients sc ON sc.id = si.client_id
    WHERE sc.user_id = auth.uid()
  )
);
