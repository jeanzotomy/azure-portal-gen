-- Prevent duplicate applications per job (by user_id when authenticated, by email otherwise)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_job_applications_job_user
  ON public.job_applications (job_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_job_applications_job_email
  ON public.job_applications (job_id, lower(email));