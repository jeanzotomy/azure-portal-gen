
-- 1. Remove overly permissive policies for candidate_badges (use SECURITY DEFINER award_badge instead)
DROP POLICY IF EXISTS "Users insert own badges" ON public.candidate_badges;

-- 2. Remove overly permissive policies for candidate_gamification (trigger uses SECURITY DEFINER)
DROP POLICY IF EXISTS "Users update own gamification" ON public.candidate_gamification;
DROP POLICY IF EXISTS "Users upsert own gamification" ON public.candidate_gamification;

-- 3. Protect quiz grading fields on onboarding_assigned_trainings via trigger
CREATE OR REPLACE FUNCTION public.protect_training_grading_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Staff (admin/hr/gestionnaire) and service_role can edit grading fields freely
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'hr'::app_role)
     OR public.has_role(auth.uid(), 'gestionnaire'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Candidates may NOT modify grading/status fields directly — only via RPC
  NEW.quiz_score        := OLD.quiz_score;
  NEW.quiz_passed       := OLD.quiz_passed;
  NEW.quiz_open_grades  := OLD.quiz_open_grades;
  NEW.quiz_submitted_at := OLD.quiz_submitted_at;
  NEW.quiz_time_seconds := OLD.quiz_time_seconds;
  NEW.completed_at      := OLD.completed_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_training_grading ON public.onboarding_assigned_trainings;
CREATE TRIGGER trg_protect_training_grading
BEFORE UPDATE ON public.onboarding_assigned_trainings
FOR EACH ROW EXECUTE FUNCTION public.protect_training_grading_fields();

-- 4. RPC for candidates to safely submit a quiz attempt
CREATE OR REPLACE FUNCTION public.submit_training_quiz_attempt(
  _assigned_id uuid,
  _quiz_score integer,
  _quiz_passed boolean,
  _quiz_answers jsonb,
  _quiz_open_answers jsonb,
  _quiz_open_grades jsonb,
  _quiz_time_seconds integer,
  _module_times jsonb,
  _total_seconds integer
)
RETURNS public.onboarding_assigned_trainings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.onboarding_assigned_trainings;
  v_passing int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the caller owns the process (or is staff)
  IF NOT EXISTS (
    SELECT 1
    FROM public.onboarding_assigned_trainings a
    JOIN public.onboarding_processes p ON p.id = a.process_id
    WHERE a.id = _assigned_id
      AND (
        p.user_id = v_uid
        OR public.has_role(v_uid, 'admin'::app_role)
        OR public.has_role(v_uid, 'hr'::app_role)
        OR public.has_role(v_uid, 'gestionnaire'::app_role)
      )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF _quiz_score IS NULL OR _quiz_score < 0 OR _quiz_score > 100 THEN
    RAISE EXCEPTION 'Invalid quiz score';
  END IF;

  -- Recompute passed server-side from training's passing_score when possible
  SELECT t.passing_score INTO v_passing
  FROM public.onboarding_assigned_trainings a
  JOIN public.trainings t ON t.id = a.training_id
  WHERE a.id = _assigned_id;

  IF v_passing IS NULL THEN v_passing := 70; END IF;

  UPDATE public.onboarding_assigned_trainings
  SET quiz_score        = _quiz_score,
      quiz_passed       = (_quiz_score >= v_passing),
      quiz_answers      = COALESCE(_quiz_answers, quiz_answers),
      quiz_open_answers = COALESCE(_quiz_open_answers, quiz_open_answers),
      quiz_open_grades  = COALESCE(_quiz_open_grades, quiz_open_grades),
      quiz_submitted_at = now(),
      quiz_time_seconds = COALESCE(_quiz_time_seconds, quiz_time_seconds),
      module_times      = COALESCE(_module_times, module_times),
      total_seconds     = COALESCE(_total_seconds, total_seconds),
      completed_at      = CASE WHEN (_quiz_score >= v_passing) THEN now() ELSE completed_at END,
      quiz_draft_answers = CASE WHEN (_quiz_score >= v_passing) THEN '{}'::jsonb ELSE quiz_draft_answers END,
      quiz_page         = CASE WHEN (_quiz_score >= v_passing) THEN 0 ELSE quiz_page END
  WHERE id = _assigned_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_training_quiz_attempt(uuid,integer,boolean,jsonb,jsonb,jsonb,integer,jsonb,integer) TO authenticated;

-- 5. training_certificates SELECT policies for owners + staff
CREATE POLICY "Users read own certificates"
ON public.training_certificates
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'hr'::app_role)
  OR public.has_role(auth.uid(), 'gestionnaire'::app_role)
);

-- 6. Server-side SMS MFA verification table (replaces sessionStorage trust)
CREATE TABLE IF NOT EXISTS public.mfa_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  method text NOT NULL DEFAULT 'sms',
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours')
);

CREATE INDEX IF NOT EXISTS mfa_verifications_user_idx
  ON public.mfa_verifications(user_id, expires_at DESC);

GRANT SELECT ON public.mfa_verifications TO authenticated;
GRANT ALL ON public.mfa_verifications TO service_role;

ALTER TABLE public.mfa_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own MFA verifications"
ON public.mfa_verifications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role manages MFA verifications"
ON public.mfa_verifications
FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.has_recent_sms_mfa(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mfa_verifications
    WHERE user_id = _user_id AND expires_at > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_recent_sms_mfa(uuid) TO authenticated;
