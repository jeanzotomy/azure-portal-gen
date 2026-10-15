CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.internal_secret (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private.internal_secret FROM PUBLIC, anon, authenticated;
INSERT INTO private.internal_secret(id, value)
VALUES (1, encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.check_internal_secret(_secret text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT EXISTS (SELECT 1 FROM private.internal_secret WHERE value = _secret AND length(coalesce(_secret,'')) > 20)
$$;
REVOKE ALL ON FUNCTION public.check_internal_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_internal_secret(text) TO service_role;

CREATE OR REPLACE FUNCTION public.internal_call(_fn text, _body jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_secret text;
BEGIN
  SELECT value INTO v_secret FROM private.internal_secret WHERE id = 1;
  PERFORM net.http_post(
    url := 'https://zwzazxebufydnaxezngx.supabase.co/functions/v1/' || _fn,
    body := _body,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3emF6eGVidWZ5ZG5heGV6bmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mjc1NjMsImV4cCI6MjA5MTMwMzU2M30.wL1NrlAeer5XEIHB2LQJj0gL4O7Ou4mdpRnPDcpX3_g',
      'x-internal-secret', v_secret)
  );
END $$;
REVOKE ALL ON FUNCTION public.internal_call(text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_application_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.internal_call('notify-application-status', jsonb_build_object('application_id', NEW.id, 'event', 'created'));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.internal_call('notify-application-status', jsonb_build_object('application_id', NEW.id));
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trigger_cv_analysis()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.internal_call('analyze-cv', jsonb_build_object('application_id', NEW.id));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.handle_application_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_proc_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'acceptee' THEN
    v_proc_id := public.create_onboarding_for_application(NEW.id);
    PERFORM public.internal_call('onboarding-invite', jsonb_build_object('process_id', v_proc_id, 'application_id', NEW.id));
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_onboarding_contracts_candidate_locks()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE is_staff boolean;
BEGIN
  is_staff := has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestionnaire'::app_role) OR has_role(auth.uid(), 'hr'::app_role);
  IF OLD.signed_at IS NOT NULL AND (
       NEW.signed_at IS DISTINCT FROM OLD.signed_at
       OR NEW.signature_url IS DISTINCT FROM OLD.signature_url
       OR NEW.contract_file_path IS DISTINCT FROM OLD.contract_file_path) THEN
    RAISE EXCEPTION 'Contrat déjà signé : il ne peut plus être modifié';
  END IF;
  IF NOT is_staff THEN
    IF NEW.contract_file_path IS DISTINCT FROM OLD.contract_file_path
       OR NEW.contract_file_name IS DISTINCT FROM OLD.contract_file_name
       OR NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by
       OR NEW.uploaded_at IS DISTINCT FROM OLD.uploaded_at
       OR NEW.process_id IS DISTINCT FROM OLD.process_id
       OR NEW.notes IS DISTINCT FROM OLD.notes THEN
      RAISE EXCEPTION 'Not allowed to modify protected onboarding_contracts fields';
    END IF;
    IF (NEW.signed_at IS DISTINCT FROM OLD.signed_at OR NEW.signature_url IS DISTINCT FROM OLD.signature_url OR NEW.signed_pdf_path IS DISTINCT FROM OLD.signed_pdf_path)
       AND coalesce(current_setting('app.contract_signing', true), '') <> 'on' THEN
      RAISE EXCEPTION 'La signature doit passer par la procédure de signature';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.sign_onboarding_contract(_contract_id uuid, _signature_url text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_now timestamptz := now();
BEGIN
  IF _signature_url IS NULL OR length(_signature_url) < 5 OR length(_signature_url) > 1000 THEN
    RAISE EXCEPTION 'Signature invalide';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.onboarding_contracts c JOIN public.onboarding_processes p ON p.id = c.process_id
    WHERE c.id = _contract_id AND p.user_id = auth.uid() AND c.signed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Contrat introuvable ou déjà signé';
  END IF;
  PERFORM set_config('app.contract_signing', 'on', true);
  UPDATE public.onboarding_contracts SET signature_url = _signature_url, signed_at = v_now WHERE id = _contract_id;
  PERFORM set_config('app.contract_signing', '', true);
  RETURN v_now;
END $$;
REVOKE ALL ON FUNCTION public.sign_onboarding_contract(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sign_onboarding_contract(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_application_on_open_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.job_postings WHERE id = NEW.job_id AND status = 'publiee') THEN
    RAISE EXCEPTION 'Cette offre n''accepte plus de candidatures';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_application_on_open_job ON public.job_applications;
CREATE TRIGGER trg_application_on_open_job BEFORE INSERT ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_application_on_open_job();