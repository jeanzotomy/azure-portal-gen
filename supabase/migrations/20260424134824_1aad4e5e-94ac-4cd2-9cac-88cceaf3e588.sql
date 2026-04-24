CREATE OR REPLACE FUNCTION public.notify_application_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url TEXT := 'https://zwzazxebufydnaxezngx.supabase.co/functions/v1/notify-application-status';
  v_key TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN
      SELECT decrypted_secret INTO v_key
      FROM vault.decrypted_secrets
      WHERE name = 'app_service_role_key'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_key := NULL;
    END;

    PERFORM net.http_post(
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
$function$;