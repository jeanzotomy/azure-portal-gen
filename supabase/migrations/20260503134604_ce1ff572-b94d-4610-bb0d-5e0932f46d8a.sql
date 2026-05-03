-- Job postings: RH gère le recrutement
CREATE POLICY "RH manage job postings" ON public.job_postings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'hr'))
WITH CHECK (public.has_role(auth.uid(), 'hr'));

-- Job applications: lecture seule pour RH
CREATE POLICY "RH view applications" ON public.job_applications
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'hr'));

-- Onboarding: lecture seule pour RH
CREATE POLICY "RH view onboarding processes" ON public.onboarding_processes
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "RH view onboarding steps" ON public.onboarding_steps
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "RH view onboarding documents" ON public.onboarding_documents
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "RH view onboarding contracts" ON public.onboarding_contracts
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'hr'));

CREATE POLICY "RH view onboarding messages" ON public.onboarding_messages
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'hr'));

-- Profiles: RH peut voir les profils (pour identifier les candidats inscrits)
CREATE POLICY "RH can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'hr'));
