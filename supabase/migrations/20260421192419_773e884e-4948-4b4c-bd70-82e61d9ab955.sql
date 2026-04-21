CREATE TABLE public.sectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view sectors"
ON public.sectors FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage sectors"
ON public.sectors FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestionnaires manage sectors"
ON public.sectors FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gestionnaire'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));

CREATE TRIGGER update_sectors_updated_at
BEFORE UPDATE ON public.sectors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();