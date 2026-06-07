
-- 1) Étendre trainings pour contenu IA + QCM
ALTER TABLE public.trainings
  ALTER COLUMN url DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS content jsonb,
  ADD COLUMN IF NOT EXISTS quiz jsonb,
  ADD COLUMN IF NOT EXISTS passing_score int NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS level text;

-- 2) Étendre onboarding_assigned_trainings pour résultats QCM + raison d'assignation
ALTER TABLE public.onboarding_assigned_trainings
  ADD COLUMN IF NOT EXISTS quiz_score int,
  ADD COLUMN IF NOT EXISTS quiz_answers jsonb,
  ADD COLUMN IF NOT EXISTS quiz_passed boolean,
  ADD COLUMN IF NOT EXISTS quiz_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- 3) Groupes de formation
CREATE TABLE IF NOT EXISTS public.training_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_groups TO authenticated;
GRANT ALL ON public.training_groups TO service_role;
ALTER TABLE public.training_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR/Admin/Gest manage training groups" ON public.training_groups FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestionnaire') OR has_role(auth.uid(),'hr'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestionnaire') OR has_role(auth.uid(),'hr'));
CREATE TRIGGER trg_training_groups_updated BEFORE UPDATE ON public.training_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.training_group_members (
  group_id uuid NOT NULL REFERENCES public.training_groups(id) ON DELETE CASCADE,
  process_id uuid NOT NULL REFERENCES public.onboarding_processes(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by uuid NOT NULL,
  PRIMARY KEY (group_id, process_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_group_members TO authenticated;
GRANT ALL ON public.training_group_members TO service_role;
ALTER TABLE public.training_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR/Admin/Gest manage training group members" ON public.training_group_members FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestionnaire') OR has_role(auth.uid(),'hr'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestionnaire') OR has_role(auth.uid(),'hr'));

CREATE TABLE IF NOT EXISTS public.training_group_assignments (
  group_id uuid NOT NULL REFERENCES public.training_groups(id) ON DELETE CASCADE,
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid NOT NULL,
  PRIMARY KEY (group_id, training_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_group_assignments TO authenticated;
GRANT ALL ON public.training_group_assignments TO service_role;
ALTER TABLE public.training_group_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR/Admin/Gest manage training group assignments" ON public.training_group_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestionnaire') OR has_role(auth.uid(),'hr'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestionnaire') OR has_role(auth.uid(),'hr'));

-- 4) Trigger : auto-assigner les formations selon le département du poste à la création d'un onboarding_process
CREATE OR REPLACE FUNCTION public.auto_assign_trainings_by_department()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dept text; v_sector text;
BEGIN
  IF NEW.job_id IS NOT NULL THEN
    SELECT department, sector INTO v_dept, v_sector FROM public.job_postings WHERE id = NEW.job_id;
    INSERT INTO public.onboarding_assigned_trainings (process_id, training_id, assigned_by, source)
    SELECT NEW.id, t.id, COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'::uuid), 'auto_department'
    FROM public.trainings t
    WHERE t.active = true
      AND (
        (v_dept IS NOT NULL AND v_dept = ANY(t.departments))
        OR (v_sector IS NOT NULL AND v_sector = ANY(t.sectors))
      )
    ON CONFLICT (process_id, training_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_assign_trainings ON public.onboarding_processes;
CREATE TRIGGER trg_auto_assign_trainings AFTER INSERT ON public.onboarding_processes
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_trainings_by_department();

-- 5) Trigger : quand un training est assigné à un groupe, propager à tous les membres
CREATE OR REPLACE FUNCTION public.propagate_group_training_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.onboarding_assigned_trainings (process_id, training_id, assigned_by, source)
  SELECT m.process_id, NEW.training_id, NEW.assigned_by, 'group'
  FROM public.training_group_members m WHERE m.group_id = NEW.group_id
  ON CONFLICT (process_id, training_id) DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_propagate_group_training ON public.training_group_assignments;
CREATE TRIGGER trg_propagate_group_training AFTER INSERT ON public.training_group_assignments
  FOR EACH ROW EXECUTE FUNCTION public.propagate_group_training_assignment();

-- 6) Trigger : quand un membre rejoint un groupe, lui assigner toutes les formations du groupe
CREATE OR REPLACE FUNCTION public.propagate_group_member_trainings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.onboarding_assigned_trainings (process_id, training_id, assigned_by, source)
  SELECT NEW.process_id, ga.training_id, NEW.added_by, 'group'
  FROM public.training_group_assignments ga WHERE ga.group_id = NEW.group_id
  ON CONFLICT (process_id, training_id) DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_propagate_group_member ON public.training_group_members;
CREATE TRIGGER trg_propagate_group_member AFTER INSERT ON public.training_group_members
  FOR EACH ROW EXECUTE FUNCTION public.propagate_group_member_trainings();
