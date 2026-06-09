ALTER TABLE public.onboarding_assigned_trainings
  ADD COLUMN IF NOT EXISTS course_page integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quiz_page integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quiz_draft_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;