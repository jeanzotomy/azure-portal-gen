
-- 1. Add 'kind' to onboarding_processes
ALTER TABLE public.onboarding_processes
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'onboarding';

ALTER TABLE public.onboarding_processes
  DROP CONSTRAINT IF EXISTS onboarding_processes_kind_check;

ALTER TABLE public.onboarding_processes
  ADD CONSTRAINT onboarding_processes_kind_check
  CHECK (kind IN ('onboarding','employee_training'));

-- application_id was NOT NULL; allow NULL for employee_training
ALTER TABLE public.onboarding_processes
  ALTER COLUMN application_id DROP NOT NULL;

-- Ensure application_id present for 'onboarding'
ALTER TABLE public.onboarding_processes
  DROP CONSTRAINT IF EXISTS onboarding_processes_application_required;
ALTER TABLE public.onboarding_processes
  ADD CONSTRAINT onboarding_processes_application_required
  CHECK (kind <> 'onboarding' OR application_id IS NOT NULL);

-- One employee_training process per user
CREATE UNIQUE INDEX IF NOT EXISTS uq_onboarding_employee_user
  ON public.onboarding_processes (user_id)
  WHERE kind = 'employee_training';

-- 2. get_or_create_employee_process: admin/HR only
CREATE OR REPLACE FUNCTION public.get_or_create_employee_process(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proc_id uuid;
  v_name text;
  v_email text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'hr'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT id INTO v_proc_id
  FROM public.onboarding_processes
  WHERE user_id = _user_id AND kind = 'employee_training'
  LIMIT 1;

  IF v_proc_id IS NOT NULL THEN
    RETURN v_proc_id;
  END IF;

  SELECT COALESCE(p.full_name, 'Employé') , u.email
    INTO v_name, v_email
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.id = _user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.onboarding_processes
    (kind, user_id, candidate_email, candidate_name, status, current_step)
  VALUES
    ('employee_training', _user_id, v_email, COALESCE(v_name, 'Employé'), 'en_cours', 1)
  RETURNING id INTO v_proc_id;

  RETURN v_proc_id;
END;
$$;

-- 3. assign_employee_training
CREATE OR REPLACE FUNCTION public.assign_employee_training(_user_id uuid, _training_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proc_id uuid;
  v_assigned_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'hr'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_proc_id := public.get_or_create_employee_process(_user_id);

  INSERT INTO public.onboarding_assigned_trainings
    (process_id, training_id, assigned_by, source)
  VALUES
    (v_proc_id, _training_id, auth.uid(), 'employee')
  ON CONFLICT (process_id, training_id) DO UPDATE SET assigned_by = EXCLUDED.assigned_by
  RETURNING id INTO v_assigned_id;

  RETURN v_assigned_id;
END;
$$;

-- 4. unassign_employee_training (only if not completed)
CREATE OR REPLACE FUNCTION public.unassign_employee_training(_user_id uuid, _training_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'hr'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH del AS (
    DELETE FROM public.onboarding_assigned_trainings a
    USING public.onboarding_processes p
    WHERE p.id = a.process_id
      AND p.kind = 'employee_training'
      AND p.user_id = _user_id
      AND a.training_id = _training_id
      AND a.completed_at IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM del;

  RETURN v_deleted > 0;
END;
$$;

-- 5. list assignable users with stats
CREATE OR REPLACE FUNCTION public.list_employee_assignable_users()
RETURNS TABLE(
  user_id uuid,
  full_name text,
  email text,
  total_assigned int,
  total_completed int,
  process_id uuid
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'hr'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    COALESCE(pr.full_name, 'Utilisateur') AS full_name,
    u.email::text AS email,
    COALESCE(s.total_assigned, 0)::int AS total_assigned,
    COALESCE(s.total_completed, 0)::int AS total_completed,
    p.id AS process_id
  FROM auth.users u
  LEFT JOIN public.profiles pr ON pr.user_id = u.id
  LEFT JOIN public.onboarding_processes p
    ON p.user_id = u.id AND p.kind = 'employee_training'
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS total_assigned,
      COUNT(*) FILTER (WHERE a.completed_at IS NOT NULL) AS total_completed
    FROM public.onboarding_assigned_trainings a
    WHERE a.process_id = p.id
  ) s ON true
  ORDER BY full_name;
END;
$$;

-- 6. list employee trainings for a given user (admin/HR or self)
CREATE OR REPLACE FUNCTION public.list_employee_trainings_for_user(_user_id uuid)
RETURNS TABLE(
  assigned_id uuid,
  training_id uuid,
  title text,
  category text,
  duration_minutes int,
  assigned_at timestamptz,
  completed_at timestamptz,
  quiz_score int,
  quiz_passed boolean,
  source text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'hr'::app_role)
    OR auth.uid() = _user_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    a.id, t.id, t.title, t.category, t.duration_minutes,
    a.assigned_at, a.completed_at, a.quiz_score, a.quiz_passed, a.source
  FROM public.onboarding_processes p
  JOIN public.onboarding_assigned_trainings a ON a.process_id = p.id
  JOIN public.trainings t ON t.id = a.training_id
  WHERE p.user_id = _user_id AND p.kind = 'employee_training'
  ORDER BY a.assigned_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_employee_process(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_employee_training(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unassign_employee_training(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_employee_assignable_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_employee_trainings_for_user(uuid) TO authenticated;
