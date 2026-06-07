
-- Restrict candidate updates on onboarding_contracts to signature fields only
DROP POLICY IF EXISTS "Candidates sign own contract" ON public.onboarding_contracts;
CREATE POLICY "Candidates sign own contract"
ON public.onboarding_contracts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.onboarding_processes p
    WHERE p.id = onboarding_contracts.process_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.onboarding_processes p
    WHERE p.id = onboarding_contracts.process_id AND p.user_id = auth.uid()
  )
  -- immutable fields (must not be changed by candidate)
  AND contract_file_path     IS NOT DISTINCT FROM (SELECT c.contract_file_path     FROM public.onboarding_contracts c WHERE c.id = onboarding_contracts.id)
  AND contract_file_name     IS NOT DISTINCT FROM (SELECT c.contract_file_name     FROM public.onboarding_contracts c WHERE c.id = onboarding_contracts.id)
  AND uploaded_by            IS NOT DISTINCT FROM (SELECT c.uploaded_by            FROM public.onboarding_contracts c WHERE c.id = onboarding_contracts.id)
  AND uploaded_at            IS NOT DISTINCT FROM (SELECT c.uploaded_at            FROM public.onboarding_contracts c WHERE c.id = onboarding_contracts.id)
  AND process_id             IS NOT DISTINCT FROM (SELECT c.process_id             FROM public.onboarding_contracts c WHERE c.id = onboarding_contracts.id)
  AND notes                  IS NOT DISTINCT FROM (SELECT c.notes                  FROM public.onboarding_contracts c WHERE c.id = onboarding_contracts.id)
);

-- Restrict candidate updates on onboarding_steps to the data column only
DROP POLICY IF EXISTS "Candidates update own steps data" ON public.onboarding_steps;
CREATE POLICY "Candidates update own steps data"
ON public.onboarding_steps
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.onboarding_processes p
    WHERE p.id = onboarding_steps.process_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.onboarding_processes p
    WHERE p.id = onboarding_steps.process_id AND p.user_id = auth.uid()
  )
  AND step_key     IS NOT DISTINCT FROM (SELECT s.step_key     FROM public.onboarding_steps s WHERE s.id = onboarding_steps.id)
  AND step_order   IS NOT DISTINCT FROM (SELECT s.step_order   FROM public.onboarding_steps s WHERE s.id = onboarding_steps.id)
  AND title        IS NOT DISTINCT FROM (SELECT s.title        FROM public.onboarding_steps s WHERE s.id = onboarding_steps.id)
  AND description  IS NOT DISTINCT FROM (SELECT s.description  FROM public.onboarding_steps s WHERE s.id = onboarding_steps.id)
  AND status       IS NOT DISTINCT FROM (SELECT s.status       FROM public.onboarding_steps s WHERE s.id = onboarding_steps.id)
  AND completed_at IS NOT DISTINCT FROM (SELECT s.completed_at FROM public.onboarding_steps s WHERE s.id = onboarding_steps.id)
  AND process_id   IS NOT DISTINCT FROM (SELECT s.process_id   FROM public.onboarding_steps s WHERE s.id = onboarding_steps.id)
);
