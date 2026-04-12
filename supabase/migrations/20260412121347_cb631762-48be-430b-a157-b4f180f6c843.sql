
-- Allow all authenticated users to read sharepoint_config (needed for file uploads)
CREATE POLICY "All authenticated users can read sharepoint config"
ON public.sharepoint_config FOR SELECT
TO authenticated
USING (true);

-- Insert the global SharePoint config for the "projet" site
INSERT INTO public.sharepoint_config (user_id, site_id, drive_id, site_name)
VALUES (
  '2f593ef3-e4a8-4aaf-9267-9cea94cc1cf0',
  'cloudzdesigns.sharepoint.com,fc39be49-3e52-4fae-a29d-507e6d908159,6791c76e-ea45-4569-aeac-f939fea9025b',
  'b!Sb45_FI-rk-inVB-bZCBWW7HkWdF6mlFrqz5Of6pAlsaA0UrP_onQrZBJ6yCQlht',
  'projet'
);
