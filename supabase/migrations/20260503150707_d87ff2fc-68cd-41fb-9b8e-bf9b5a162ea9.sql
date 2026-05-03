-- Trainings library
CREATE TABLE public.trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  duration_minutes INTEGER,
  category TEXT,
  target_job_titles TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage trainings" ON public.trainings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Gestionnaires manage trainings" ON public.trainings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'gestionnaire'::app_role)) WITH CHECK (has_role(auth.uid(),'gestionnaire'::app_role));
CREATE POLICY "RH manage trainings" ON public.trainings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'hr'::app_role)) WITH CHECK (has_role(auth.uid(),'hr'::app_role));
CREATE POLICY "Authenticated can view active trainings" ON public.trainings FOR SELECT TO authenticated
  USING (active = true);

CREATE TRIGGER trg_trainings_updated BEFORE UPDATE ON public.trainings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Assignments
CREATE TABLE public.onboarding_assigned_trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL,
  training_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE (process_id, training_id)
);

ALTER TABLE public.onboarding_assigned_trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage assigned trainings" ON public.onboarding_assigned_trainings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Gestionnaires manage assigned trainings" ON public.onboarding_assigned_trainings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'gestionnaire'::app_role)) WITH CHECK (has_role(auth.uid(),'gestionnaire'::app_role));
CREATE POLICY "RH manage assigned trainings" ON public.onboarding_assigned_trainings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'hr'::app_role)) WITH CHECK (has_role(auth.uid(),'hr'::app_role));
CREATE POLICY "Candidates view own assigned trainings" ON public.onboarding_assigned_trainings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM onboarding_processes p WHERE p.id = process_id AND p.user_id = auth.uid()));
CREATE POLICY "Candidates mark own training completed" ON public.onboarding_assigned_trainings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM onboarding_processes p WHERE p.id = process_id AND p.user_id = auth.uid()));
