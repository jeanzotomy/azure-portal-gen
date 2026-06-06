
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS ai_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ai_score int,
  ADD COLUMN IF NOT EXISTS ai_match_percentage int,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_skills jsonb,
  ADD COLUMN IF NOT EXISTS ai_strengths jsonb,
  ADD COLUMN IF NOT EXISTS ai_weaknesses jsonb,
  ADD COLUMN IF NOT EXISTS ai_recommendation text,
  ADD COLUMN IF NOT EXISTS ai_experience_years int,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_error text;

CREATE OR REPLACE FUNCTION public.trigger_cv_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text := 'https://zwzazxebufydnaxezngx.supabase.co/functions/v1/analyze-cv';
  v_key text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'app_service_role_key' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_key := NULL; END;

  PERFORM net.http_post(
    url := v_url,
    body := jsonb_build_object('application_id', NEW.id),
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || COALESCE(v_key,''))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_application_created_analyze_cv ON public.job_applications;
CREATE TRIGGER on_application_created_analyze_cv
AFTER INSERT ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.trigger_cv_analysis();
