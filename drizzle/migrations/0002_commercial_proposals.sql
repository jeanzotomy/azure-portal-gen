CREATE TABLE public.commercial_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Proposition commerciale',
  client_name text NOT NULL DEFAULT '',
  client_contact text,
  client_email text,
  summary text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'brouillon',
  accepted_option integer,
  valid_until date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_proposals TO authenticated;
GRANT ALL ON public.commercial_proposals TO service_role;
ALTER TABLE public.commercial_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sales staff manage proposals" ON public.commercial_proposals FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestionnaire') OR public.has_role(auth.uid(),'agent'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestionnaire') OR public.has_role(auth.uid(),'agent'));
CREATE TRIGGER trg_commercial_proposals_updated BEFORE UPDATE ON public.commercial_proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();