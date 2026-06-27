
-- 1) projects: lock user_id on UPDATE for everyone (incl. clients)
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update all projects" ON public.projects;
CREATE POLICY "Admins can update all projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Gestionnaires can update all projects" ON public.projects;
CREATE POLICY "Gestionnaires can update all projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gestionnaire'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'gestionnaire'::app_role));

-- 2) support_tickets: staff UPDATE must keep the owner immutable
DROP POLICY IF EXISTS "Admins can update all tickets" ON public.support_tickets;
CREATE POLICY "Admins can update all tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND user_id = (SELECT t.user_id FROM public.support_tickets t WHERE t.id = support_tickets.id)
  );

DROP POLICY IF EXISTS "Agents can update all tickets" ON public.support_tickets;
CREATE POLICY "Agents can update all tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'agent'::app_role))
  WITH CHECK (
    public.has_role(auth.uid(), 'agent'::app_role)
    AND user_id = (SELECT t.user_id FROM public.support_tickets t WHERE t.id = support_tickets.id)
  );

DROP POLICY IF EXISTS "Gestionnaires can update all tickets" ON public.support_tickets;
CREATE POLICY "Gestionnaires can update all tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gestionnaire'::app_role))
  WITH CHECK (
    public.has_role(auth.uid(), 'gestionnaire'::app_role)
    AND user_id = (SELECT t.user_id FROM public.support_tickets t WHERE t.id = support_tickets.id)
  );

-- 3) contact_requests: admin UPDATE WITH CHECK
DROP POLICY IF EXISTS "Admins can update contact requests" ON public.contact_requests;
CREATE POLICY "Admins can update contact requests" ON public.contact_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) sharepoint_config: admin UPDATE WITH CHECK
DROP POLICY IF EXISTS "Admins can update sharepoint config" ON public.sharepoint_config;
CREATE POLICY "Admins can update sharepoint config" ON public.sharepoint_config
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 5) profiles: prevent users from elevating themselves via plan_tier or rebinding user_id
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND user_id = (SELECT p.user_id FROM public.profiles p WHERE p.id = profiles.id)
    AND blocked IS NOT DISTINCT FROM (SELECT p.blocked FROM public.profiles p WHERE p.user_id = auth.uid())
    AND deleted_at IS NOT DISTINCT FROM (SELECT p.deleted_at FROM public.profiles p WHERE p.user_id = auth.uid())
    AND plan_tier IS NOT DISTINCT FROM (SELECT p.plan_tier FROM public.profiles p WHERE p.user_id = auth.uid())
  );
