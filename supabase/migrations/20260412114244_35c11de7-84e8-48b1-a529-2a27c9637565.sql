
-- Comptable can view all projects (read-only)
CREATE POLICY "Comptables can view all projects"
ON public.projects FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'comptable'::app_role));

-- Comptable can view all project files (read-only)
CREATE POLICY "Comptables can view all project files"
ON public.project_files FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'comptable'::app_role));

-- Restrict sharepoint_config: remove comptable write access
DROP POLICY IF EXISTS "Admins and comptables can insert sharepoint config" ON public.sharepoint_config;
DROP POLICY IF EXISTS "Admins and comptables can update sharepoint config" ON public.sharepoint_config;
DROP POLICY IF EXISTS "Admins and comptables can delete sharepoint config" ON public.sharepoint_config;

-- Re-create write policies for admin only
CREATE POLICY "Admins can insert sharepoint config"
ON public.sharepoint_config FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update sharepoint config"
ON public.sharepoint_config FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sharepoint config"
ON public.sharepoint_config FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
