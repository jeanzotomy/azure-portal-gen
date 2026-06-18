DROP POLICY IF EXISTS "Authenticated can view active trainings" ON public.trainings;

CREATE POLICY "Authenticated can view published or accessible trainings"
  ON public.trainings FOR SELECT
  TO authenticated
  USING (
    (active = true AND published = true)
    OR public.can_access_training(auth.uid(), id)
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr')
    OR public.has_role(auth.uid(), 'gestionnaire')
  );