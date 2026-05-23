CREATE OR REPLACE FUNCTION public.submit_job_application(
  p_job_id uuid,
  p_full_name text,
  p_email text,
  p_cv_path text,
  p_user_id uuid DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_linkedin_url text DEFAULT NULL,
  p_portfolio_url text DEFAULT NULL,
  p_years_experience int DEFAULT NULL,
  p_salary_expectation text DEFAULT NULL,
  p_cover_letter_path text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(id uuid, tracking_id text, already_exists boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing record;
  v_new record;
BEGIN
  IF p_job_id IS NULL OR p_full_name IS NULL OR p_email IS NULL OR p_cv_path IS NULL THEN
    RAISE EXCEPTION 'Champs obligatoires manquants';
  END IF;

  -- Idempotence: si une candidature existe déjà pour ce job avec ce user_id ou cet email
  SELECT a.id, a.tracking_id INTO v_existing
  FROM public.job_applications a
  WHERE a.job_id = p_job_id
    AND (
      (p_user_id IS NOT NULL AND a.user_id = p_user_id)
      OR lower(a.email) = lower(p_email)
    )
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN QUERY SELECT v_existing.id, v_existing.tracking_id, true;
    RETURN;
  END IF;

  INSERT INTO public.job_applications(
    job_id, user_id, full_name, email, phone, linkedin_url, portfolio_url,
    years_experience, salary_expectation, cv_path, cover_letter_path, notes
  ) VALUES (
    p_job_id, p_user_id, p_full_name, lower(p_email), p_phone, p_linkedin_url, p_portfolio_url,
    p_years_experience, p_salary_expectation, p_cv_path, p_cover_letter_path, p_notes
  )
  RETURNING job_applications.id, job_applications.tracking_id INTO v_new;

  RETURN QUERY SELECT v_new.id, v_new.tracking_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_job_application(uuid, text, text, text, uuid, text, text, text, int, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_job_application(uuid, text, text, text, uuid, text, text, text, int, text, text, text) TO anon, authenticated;