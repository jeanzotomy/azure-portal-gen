
-- 1) learner_xp_events: restrict SELECT
DROP POLICY IF EXISTS "authenticated reads xp events" ON public.learner_xp_events;
CREATE POLICY "users read own xp events"
  ON public.learner_xp_events FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'hr'::app_role)
    OR public.has_role(auth.uid(), 'gestionnaire'::app_role)
  );

-- 2) learner_follows: restrict SELECT
DROP POLICY IF EXISTS "authenticated reads follows" ON public.learner_follows;
CREATE POLICY "users read own follow edges"
  ON public.learner_follows FOR SELECT TO authenticated
  USING (
    follower_id = auth.uid()
    OR followee_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'hr'::app_role)
    OR public.has_role(auth.uid(), 'gestionnaire'::app_role)
  );

-- 3) admin_audit_log: remove direct INSERT for authenticated; service_role + SECURITY DEFINER RPCs only
DROP POLICY IF EXISTS "authenticated insert audit log" ON public.admin_audit_log;
REVOKE INSERT ON public.admin_audit_log FROM authenticated;
-- service_role and SECURITY DEFINER functions (e.g. log_admin_action, post_training_comment) keep write access

-- 4) training_comments: BEFORE INSERT trigger to force author_name from profiles
CREATE OR REPLACE FUNCTION public.enforce_training_comment_author_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  -- Force user_id to caller and author_name to canonical profile name
  NEW.user_id := auth.uid();
  SELECT COALESCE(NULLIF(TRIM(full_name), ''), 'Apprenant')
    INTO NEW.author_name
  FROM public.profiles
  WHERE user_id = auth.uid();
  IF NEW.author_name IS NULL THEN
    NEW.author_name := 'Apprenant';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_training_comment_author ON public.training_comments;
CREATE TRIGGER trg_enforce_training_comment_author
  BEFORE INSERT ON public.training_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_training_comment_author_name();

-- 5) OTP plaintext -> hashed storage
ALTER TABLE public.sms_otp_codes ADD COLUMN IF NOT EXISTS code_hash text;
ALTER TABLE public.application_tracking_otp ADD COLUMN IF NOT EXISTS code_hash text;

-- Backfill existing rows so we can drop the plaintext column safely
UPDATE public.sms_otp_codes
   SET code_hash = encode(extensions.digest(phone || ':' || code, 'sha256'), 'hex')
 WHERE code_hash IS NULL AND code IS NOT NULL;

UPDATE public.application_tracking_otp
   SET code_hash = encode(extensions.digest(email || ':' || code, 'sha256'), 'hex')
 WHERE code_hash IS NULL AND code IS NOT NULL;

ALTER TABLE public.sms_otp_codes ALTER COLUMN code DROP NOT NULL;
ALTER TABLE public.application_tracking_otp ALTER COLUMN code DROP NOT NULL;

-- Clear plaintext on existing rows (codes are short-lived; safer than leaving them)
UPDATE public.sms_otp_codes SET code = NULL WHERE code IS NOT NULL;
UPDATE public.application_tracking_otp SET code = NULL WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sms_otp_codes_phone_hash ON public.sms_otp_codes(phone, code_hash);
CREATE INDEX IF NOT EXISTS idx_app_track_otp_email_hash ON public.application_tracking_otp(email, code_hash);
