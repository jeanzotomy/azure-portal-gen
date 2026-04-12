
DROP POLICY IF EXISTS "Users can view own sharepoint config" ON public.sharepoint_config;
DROP POLICY IF EXISTS "Users can insert own sharepoint config" ON public.sharepoint_config;
DROP POLICY IF EXISTS "Users can update own sharepoint config" ON public.sharepoint_config;
DROP POLICY IF EXISTS "Users can delete own sharepoint config" ON public.sharepoint_config;
DROP POLICY IF EXISTS "Admins can view all sharepoint config" ON public.sharepoint_config;

CREATE POLICY "Admins and comptables can view sharepoint config"
ON public.sharepoint_config FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'comptable'::app_role));

CREATE POLICY "Admins and comptables can insert sharepoint config"
ON public.sharepoint_config FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'comptable'::app_role));

CREATE POLICY "Admins and comptables can update sharepoint config"
ON public.sharepoint_config FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'comptable'::app_role));

CREATE POLICY "Admins and comptables can delete sharepoint config"
ON public.sharepoint_config FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'comptable'::app_role));
