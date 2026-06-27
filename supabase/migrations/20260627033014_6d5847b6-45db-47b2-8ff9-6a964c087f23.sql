
-- 1) Trainings: revoke SELECT on `quiz` from anon/authenticated.
--    Public/learners must use the `get_training_quiz` RPC (which strips answer keys for non-staff).
REVOKE SELECT (quiz) ON public.trainings FROM anon;
REVOKE SELECT (quiz) ON public.trainings FROM authenticated;
GRANT  SELECT (quiz) ON public.trainings TO service_role;

-- 2) onboarding_assigned_trainings: revoke UPDATE on grading columns from candidates.
--    Writes to these columns must go through submit_training_quiz_attempt() (SECURITY DEFINER).
REVOKE UPDATE (
  quiz_score,
  quiz_passed,
  quiz_open_grades,
  quiz_submitted_at,
  quiz_time_seconds,
  completed_at
) ON public.onboarding_assigned_trainings FROM anon;

REVOKE UPDATE (
  quiz_score,
  quiz_passed,
  quiz_open_grades,
  quiz_submitted_at,
  quiz_time_seconds,
  completed_at
) ON public.onboarding_assigned_trainings FROM authenticated;

GRANT UPDATE ON public.onboarding_assigned_trainings TO service_role;
