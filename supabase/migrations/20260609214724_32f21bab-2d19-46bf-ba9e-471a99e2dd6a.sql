DROP POLICY IF EXISTS "Candidates mark own training completed" ON public.onboarding_assigned_trainings;

CREATE POLICY "Candidates update own training progress"
ON public.onboarding_assigned_trainings
FOR UPDATE
TO authenticated
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
);