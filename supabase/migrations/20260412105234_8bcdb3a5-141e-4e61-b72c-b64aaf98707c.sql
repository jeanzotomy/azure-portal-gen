
-- Add sharepoint_folder_url to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sharepoint_folder_url text;

-- Create sharepoint_config table
CREATE TABLE IF NOT EXISTS public.sharepoint_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  site_id text NOT NULL,
  site_name text,
  drive_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sharepoint_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sharepoint config"
ON public.sharepoint_config FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sharepoint config"
ON public.sharepoint_config FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sharepoint config"
ON public.sharepoint_config FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sharepoint config"
ON public.sharepoint_config FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sharepoint config"
ON public.sharepoint_config FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_sharepoint_config_updated_at
BEFORE UPDATE ON public.sharepoint_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
