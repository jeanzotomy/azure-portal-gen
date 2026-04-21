ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Backfill first_name / last_name from existing full_name when possible
UPDATE public.profiles
SET
  first_name = COALESCE(first_name, NULLIF(split_part(full_name, ' ', 1), '')),
  last_name = COALESCE(last_name, NULLIF(NULLIF(regexp_replace(full_name, '^\S+\s*', ''), ''), full_name))
WHERE full_name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);