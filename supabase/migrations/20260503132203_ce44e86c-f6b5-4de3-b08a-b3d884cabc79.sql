
-- 1. tracking_id column
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS tracking_id text UNIQUE;

-- 2. Generator
CREATE OR REPLACE FUNCTION public.generate_application_tracking_id()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  last_seq INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('generate_application_tracking_id'));
  SELECT COALESCE(MAX((substring(tracking_id FROM 7))::INT), 0) INTO last_seq
  FROM public.job_applications
  WHERE tracking_id IS NOT NULL AND tracking_id LIKE 'CM-APP%';
  RETURN 'CM-APP' || lpad((last_seq + 1)::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_application_tracking_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_application_tracking_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_application_tracking_id ON public.job_applications;
CREATE TRIGGER trg_set_application_tracking_id
BEFORE INSERT ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.set_application_tracking_id();

-- Backfill existing rows
UPDATE public.job_applications
SET tracking_id = public.generate_application_tracking_id()
WHERE tracking_id IS NULL;

-- 3. OTP table for public tracking access
CREATE TABLE IF NOT EXISTS public.application_tracking_otp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  used boolean NOT NULL DEFAULT false,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_track_otp_email ON public.application_tracking_otp(lower(email), created_at DESC);

ALTER TABLE public.application_tracking_otp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role manages tracking otp"
ON public.application_tracking_otp
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 4. Trigger notify-application-status also for 'nouvelle' (via existing trigger on UPDATE only, so we add INSERT)
CREATE OR REPLACE FUNCTION public.notify_application_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url TEXT := 'https://zwzazxebufydnaxezngx.supabase.co/functions/v1/notify-application-status';
  v_key TEXT;
BEGIN
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
    body := jsonb_build_object('application_id', NEW.id, 'event', 'created'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_key, '')
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_application_created ON public.job_applications;
CREATE TRIGGER trg_notify_application_created
AFTER INSERT ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_application_created();
