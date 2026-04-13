
-- 1. Remove overly permissive SELECT on sharepoint_config
DROP POLICY IF EXISTS "All authenticated users can read sharepoint config" ON public.sharepoint_config;

-- Add gestionnaire read access (admin+comptable already covered)
CREATE POLICY "Gestionnaires can view sharepoint config"
ON public.sharepoint_config FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestionnaire'::app_role));

-- 2. Fix ticket_replies: drop public-role policies, recreate as authenticated
DROP POLICY IF EXISTS "Users can reply to own tickets" ON public.ticket_replies;
DROP POLICY IF EXISTS "Users can view replies on own tickets" ON public.ticket_replies;

CREATE POLICY "Users can reply to own tickets"
ON public.ticket_replies FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = user_id)
  AND (is_admin = false)
  AND (EXISTS (
    SELECT 1 FROM support_tickets
    WHERE support_tickets.id = ticket_replies.ticket_id
      AND support_tickets.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can view replies on own tickets"
ON public.ticket_replies FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM support_tickets
  WHERE support_tickets.id = ticket_replies.ticket_id
    AND support_tickets.user_id = auth.uid()
));

-- 3. Fix project_files: drop public-role policies, recreate as authenticated + add UPDATE
DROP POLICY IF EXISTS "Users can view own project files" ON public.project_files;
DROP POLICY IF EXISTS "Users can insert own project files" ON public.project_files;
DROP POLICY IF EXISTS "Users can delete own project files" ON public.project_files;

CREATE POLICY "Users can view own project files"
ON public.project_files FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project files"
ON public.project_files FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project files"
ON public.project_files FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own project files"
ON public.project_files FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Also fix Comptables policy from public to authenticated (already authenticated, just confirming)
DROP POLICY IF EXISTS "Comptables can view all project files" ON public.project_files;
CREATE POLICY "Comptables can view all project files"
ON public.project_files FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'comptable'::app_role));

-- Admin/gestionnaire access to project_files
CREATE POLICY "Admins can manage all project files"
ON public.project_files FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestionnaires can view all project files"
ON public.project_files FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestionnaire'::app_role));
