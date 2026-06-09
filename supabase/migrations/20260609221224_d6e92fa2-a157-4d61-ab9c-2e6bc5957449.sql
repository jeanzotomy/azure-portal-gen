-- Add time tracking columns to onboarding_assigned_trainings
ALTER TABLE public.onboarding_assigned_trainings
  ADD COLUMN IF NOT EXISTS module_times jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS total_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quiz_time_seconds integer,
  ADD COLUMN IF NOT EXISTS quiz_open_answers jsonb,
  ADD COLUMN IF NOT EXISTS quiz_open_grades jsonb;