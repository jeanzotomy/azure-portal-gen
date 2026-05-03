CREATE POLICY "RH update applications" ON public.job_applications
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'hr'))
WITH CHECK (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "RH manage departments" ON public.departments
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'hr'))
WITH CHECK (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "RH manage sectors" ON public.sectors
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'hr'))
WITH CHECK (public.has_role(auth.uid(), 'hr'));
