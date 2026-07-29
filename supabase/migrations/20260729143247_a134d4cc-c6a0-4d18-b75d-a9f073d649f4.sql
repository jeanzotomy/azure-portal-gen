-- onboarding_contracts
DROP POLICY IF EXISTS "Candidates sign own contract" ON public.onboarding_contracts;
CREATE POLICY "Candidates sign own contract" ON public.onboarding_contracts
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.onboarding_processes p WHERE p.id = onboarding_contracts.process_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.onboarding_processes p WHERE p.id = onboarding_contracts.process_id AND p.user_id = auth.uid()));

-- onboarding_steps
DROP POLICY IF EXISTS "Candidates update own steps data" ON public.onboarding_steps;
CREATE POLICY "Candidates update own steps data" ON public.onboarding_steps
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.onboarding_processes p WHERE p.id = onboarding_steps.process_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.onboarding_processes p WHERE p.id = onboarding_steps.process_id AND p.user_id = auth.uid()));

-- projects
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
CREATE POLICY "Users can create own projects" ON public.projects
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects" ON public.projects
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- support_tickets
DROP POLICY IF EXISTS "Admins can update all tickets" ON public.support_tickets;
CREATE POLICY "Admins can update all tickets" ON public.support_tickets
FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Agents can update all tickets" ON public.support_tickets;
CREATE POLICY "Agents can update all tickets" ON public.support_tickets
FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'agent'::app_role)) WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

DROP POLICY IF EXISTS "Gestionnaires can update all tickets" ON public.support_tickets;
CREATE POLICY "Gestionnaires can update all tickets" ON public.support_tickets
FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'gestionnaire'::app_role)) WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));

DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets" ON public.support_tickets
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
CREATE POLICY "Users can view own tickets" ON public.support_tickets
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- storage: project-files bucket
DROP POLICY IF EXISTS "Users can view own project files" ON storage.objects;
CREATE POLICY "Users can view own project files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'project-files' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload project files" ON storage.objects;
CREATE POLICY "Users can upload project files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-files' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own project files" ON storage.objects;
CREATE POLICY "Users can delete own project files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'project-files' AND (auth.uid())::text = (storage.foldername(name))[1]);