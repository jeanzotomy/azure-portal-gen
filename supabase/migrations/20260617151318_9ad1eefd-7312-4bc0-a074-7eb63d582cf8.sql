
CREATE OR REPLACE FUNCTION public.notify_training_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url TEXT := 'https://zwzazxebufydnaxezngx.supabase.co/functions/v1/notify-training-assignment';
  v_key TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name = 'app_service_role_key' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_key := NULL;
  END;

  PERFORM net.http_post(
    url := v_url,
    body := jsonb_build_object('assigned_id', NEW.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_key, '')
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_training_assignment ON public.onboarding_assigned_trainings;
CREATE TRIGGER trg_notify_training_assignment
AFTER INSERT ON public.onboarding_assigned_trainings
FOR EACH ROW EXECUTE FUNCTION public.notify_training_assignment();
