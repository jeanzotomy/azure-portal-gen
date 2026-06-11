REVOKE UPDATE (quiz_score, quiz_passed, completed_at, quiz_submitted_at, quiz_time_seconds, quiz_open_grades) ON public.onboarding_assigned_trainings FROM authenticated;
REVOKE UPDATE (quiz_score, quiz_passed, completed_at, quiz_submitted_at, quiz_time_seconds, quiz_open_grades) ON public.onboarding_assigned_trainings FROM anon;

REVOKE SELECT (quiz) ON public.trainings FROM authenticated;
REVOKE SELECT (quiz) ON public.trainings FROM anon;
GRANT  SELECT (quiz) ON public.trainings TO service_role;

CREATE OR REPLACE FUNCTION public.mark_training_followed(_assigned_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_allowed boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.onboarding_assigned_trainings a
    JOIN public.onboarding_processes p ON p.id = a.process_id
    LEFT JOIN public.trainings t ON t.id = a.training_id
    WHERE a.id = _assigned_id
      AND (
        p.user_id = v_uid
        OR public.has_role(v_uid, 'admin'::app_role)
        OR public.has_role(v_uid, 'hr'::app_role)
        OR public.has_role(v_uid, 'gestionnaire'::app_role)
      )
      AND (
        t.quiz IS NULL
        OR t.quiz->'questions' IS NULL
        OR jsonb_array_length(COALESCE(t.quiz->'questions', '[]'::jsonb)) = 0
      )
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Access denied or training requires quiz';
  END IF;

  UPDATE public.onboarding_assigned_trainings
  SET completed_at = COALESCE(completed_at, now())
  WHERE id = _assigned_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_training_followed(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_training_followed(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_training_quiz(_training_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_quiz jsonb;
  v_is_staff boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  v_is_staff := public.has_role(v_uid, 'admin'::app_role)
             OR public.has_role(v_uid, 'hr'::app_role)
             OR public.has_role(v_uid, 'gestionnaire'::app_role);

  IF NOT (v_is_staff OR public.can_access_training(v_uid, _training_id)) THEN
    RETURN NULL;
  END IF;

  SELECT quiz INTO v_quiz FROM public.trainings WHERE id = _training_id;

  IF v_quiz IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_is_staff THEN
    RETURN v_quiz;
  END IF;

  IF v_quiz ? 'questions' AND jsonb_typeof(v_quiz->'questions') = 'array' THEN
    v_quiz := jsonb_set(
      v_quiz,
      '{questions}',
      COALESCE((
        SELECT jsonb_agg(
          q
            - 'correct'
            - 'correct_index'
            - 'correctIndex'
            - 'correct_indices'
            - 'correctIndices'
            - 'answer'
            - 'correct_answer'
            - 'correctAnswer'
            - 'correctAnswers'
            - 'correct_option'
            - 'correctOption'
            - 'solution'
            - 'explanation'
            - 'expected_answer'
            - 'reference_answer'
            - 'expectedAnswer'
            - 'referenceAnswer'
        )
        FROM jsonb_array_elements(v_quiz->'questions') AS q
      ), '[]'::jsonb),
      false
    );
  END IF;

  RETURN v_quiz;
END;
$$;

REVOKE ALL ON FUNCTION public.get_training_quiz(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_training_quiz(uuid) TO authenticated;

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
) RETURNS onboarding_assigned_trainings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.onboarding_assigned_trainings;
  v_passing int;
  v_quiz jsonb;
  v_questions jsonb;
  v_q jsonb;
  v_i int;
  v_total int := 0;
  v_mcq_correct int := 0;
  v_open_total int := 0;
  v_open_score int;
  v_points int := 0;
  v_computed_score int;
  v_passed boolean;
  v_user_ans jsonb;
  v_correct_idx int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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

  SELECT t.quiz, t.passing_score
    INTO v_quiz, v_passing
  FROM public.onboarding_assigned_trainings a
  JOIN public.trainings t ON t.id = a.training_id
  WHERE a.id = _assigned_id;

  IF v_passing IS NULL THEN v_passing := 70; END IF;

  v_questions := COALESCE(v_quiz->'questions', '[]'::jsonb);
  v_total := jsonb_array_length(v_questions);

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Training has no quiz';
  END IF;

  FOR v_i IN 0 .. (v_total - 1) LOOP
    v_q := v_questions -> v_i;
    IF (v_q ->> 'type') = 'open' THEN
      v_open_score := COALESCE(((_quiz_open_grades -> v_i::text) ->> 'score')::int, 0);
      IF v_open_score < 0 THEN v_open_score := 0; END IF;
      IF v_open_score > 100 THEN v_open_score := 100; END IF;
      v_open_total := v_open_total + v_open_score;
    ELSE
      v_user_ans := _quiz_answers -> v_i::text;
      v_correct_idx := COALESCE(
        (v_q ->> 'correct_index')::int,
        (v_q ->> 'correctIndex')::int,
        (v_q ->> 'correct')::int,
        (v_q ->> 'answer')::int
      );
      IF v_user_ans IS NOT NULL
         AND v_correct_idx IS NOT NULL
         AND jsonb_typeof(v_user_ans) = 'number'
         AND (v_user_ans #>> '{}')::int = v_correct_idx THEN
        v_mcq_correct := v_mcq_correct + 1;
      END IF;
    END IF;
  END LOOP;

  v_points := (v_mcq_correct * 100) + v_open_total;
  v_computed_score := GREATEST(0, LEAST(100, ROUND(v_points::numeric / v_total)::int));
  v_passed := v_computed_score >= v_passing;

  UPDATE public.onboarding_assigned_trainings
  SET quiz_score        = v_computed_score,
      quiz_passed       = v_passed,
      quiz_answers      = COALESCE(_quiz_answers, quiz_answers),
      quiz_open_answers = COALESCE(_quiz_open_answers, quiz_open_answers),
      quiz_open_grades  = COALESCE(_quiz_open_grades, quiz_open_grades),
      quiz_submitted_at = now(),
      quiz_time_seconds = COALESCE(_quiz_time_seconds, quiz_time_seconds),
      module_times      = COALESCE(_module_times, module_times),
      total_seconds     = COALESCE(_total_seconds, total_seconds),
      completed_at      = CASE WHEN v_passed THEN now() ELSE completed_at END,
      quiz_draft_answers = CASE WHEN v_passed THEN '{}'::jsonb ELSE quiz_draft_answers END,
      quiz_page         = CASE WHEN v_passed THEN 0 ELSE quiz_page END
  WHERE id = _assigned_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;