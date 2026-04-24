-- 1. Add interview_message column to job_applications
ALTER TABLE public.job_applications
ADD COLUMN IF NOT EXISTS interview_message TEXT;

-- 2. Ensure pg_net extension is available
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 3. Store service role key & supabase url in vault for trigger use
DO $$
BEGIN
  PERFORM vault.create_secret(
    current_setting('app.settings.service_role_key', true),
    'app_service_role_key',
    'Service role key for application status notifications'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. Trigger function: call notify-application-status edge function when status changes
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url TEXT := 'https://zwzazxebufydnaxezngx.supabase.co/functions/v1/notify-application-status';
  v_key TEXT;
BEGIN
  -- Only fire when status actually changes (and not on insert)
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Try to get service role key from vault
    BEGIN
      SELECT decrypted_secret INTO v_key
      FROM vault.decrypted_secrets
      WHERE name = 'app_service_role_key'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_key := NULL;
    END;

    PERFORM extensions.http_post(
      url := v_url,
      body := jsonb_build_object('application_id', NEW.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_key, '')
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_application_status_change ON public.job_applications;
CREATE TRIGGER trg_notify_application_status_change
AFTER UPDATE OF status ON public.job_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_application_status_change();