-- Auto-update current_step when steps are completed
CREATE OR REPLACE FUNCTION public.recalc_onboarding_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_done INT;
  v_total INT;
BEGIN
  SELECT COUNT(*) FILTER (WHERE status = 'valide'), COUNT(*)
  INTO v_done, v_total
  FROM public.onboarding_steps
  WHERE process_id = NEW.process_id;

  UPDATE public.onboarding_processes
  SET current_step = LEAST(v_done + 1, v_total),
      status = CASE WHEN v_done = v_total THEN 'complete'::onboarding_status ELSE 'en_cours'::onboarding_status END,
      completed_at = CASE WHEN v_done = v_total THEN now() ELSE NULL END
  WHERE id = NEW.process_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_onboarding ON public.onboarding_steps;
CREATE TRIGGER trg_recalc_onboarding
AFTER INSERT OR UPDATE OF status ON public.onboarding_steps
FOR EACH ROW EXECUTE FUNCTION public.recalc_onboarding_progress();

-- Auto-link user_id and assign 'onboarding' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proc_id UUID;
BEGIN
  SELECT id INTO v_proc_id
  FROM public.onboarding_processes
  WHERE LOWER(candidate_email) = LOWER(NEW.email) AND user_id IS NULL
  LIMIT 1;

  IF v_proc_id IS NOT NULL THEN
    UPDATE public.onboarding_processes SET user_id = NEW.id WHERE id = v_proc_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'onboarding')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_onboarding_user ON auth.users;
CREATE TRIGGER trg_link_onboarding_user
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_onboarding();