ALTER TABLE public.trainings 
  ADD COLUMN IF NOT EXISTS departments text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sectors text[] NOT NULL DEFAULT '{}'::text[];