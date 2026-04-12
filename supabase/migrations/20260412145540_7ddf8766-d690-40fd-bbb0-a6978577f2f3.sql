
-- Projects
CREATE POLICY "Gestionnaires can view all projects"
ON public.projects FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'gestionnaire'));

CREATE POLICY "Gestionnaires can update all projects"
ON public.projects FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'gestionnaire'));

-- Support tickets
CREATE POLICY "Gestionnaires can view all tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'gestionnaire'));

CREATE POLICY "Gestionnaires can update all tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'gestionnaire'));

-- Ticket replies
CREATE POLICY "Gestionnaires can view all replies"
ON public.ticket_replies FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'gestionnaire'));

CREATE POLICY "Gestionnaires can reply to any ticket"
ON public.ticket_replies FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'gestionnaire') AND auth.uid() = user_id AND is_admin = true);

-- Profiles
CREATE POLICY "Gestionnaires can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'gestionnaire'));

-- Invoices (read-only)
CREATE POLICY "Gestionnaires can view all invoices"
ON public.invoices FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'gestionnaire'));

-- Contact requests
CREATE POLICY "Gestionnaires can view all contact requests"
ON public.contact_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'gestionnaire'));

-- User roles
CREATE POLICY "Gestionnaires can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'gestionnaire'));
