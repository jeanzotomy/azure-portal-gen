
-- 1) PROFILES: simplify policy + trigger-enforced OLD-value locks
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.enforce_profile_self_update_locks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when the profile owner is performing the update
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.user_id THEN
    IF NEW.blocked IS DISTINCT FROM OLD.blocked
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
       OR NEW.plan_tier IS DISTINCT FROM OLD.plan_tier
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Not allowed to modify protected profile fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_self_update_locks ON public.profiles;
CREATE TRIGGER trg_profiles_self_update_locks
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_self_update_locks();

-- 2) SUPPORT_TICKETS: simplify staff policies + trigger locking user_id
DROP POLICY IF EXISTS "Admins can update all tickets" ON public.support_tickets;
CREATE POLICY "Admins can update all tickets"
ON public.support_tickets FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Agents can update all tickets" ON public.support_tickets;
CREATE POLICY "Agents can update all tickets"
ON public.support_tickets FOR UPDATE
USING (has_role(auth.uid(), 'agent'::app_role))
WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

DROP POLICY IF EXISTS "Gestionnaires can update all tickets" ON public.support_tickets;
CREATE POLICY "Gestionnaires can update all tickets"
ON public.support_tickets FOR UPDATE
USING (has_role(auth.uid(), 'gestionnaire'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));

CREATE OR REPLACE FUNCTION public.enforce_support_ticket_owner_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Ticket ownership cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_owner_lock ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_owner_lock
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.enforce_support_ticket_owner_lock();

-- 3) ONBOARDING_STEPS: simplify policy + trigger enforcing candidate locks
DROP POLICY IF EXISTS "Candidates update own steps data" ON public.onboarding_steps;
CREATE POLICY "Candidates update own steps data"
ON public.onboarding_steps
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.onboarding_processes p
  WHERE p.id = onboarding_steps.process_id AND p.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.onboarding_processes p
  WHERE p.id = onboarding_steps.process_id AND p.user_id = auth.uid()
));

CREATE OR REPLACE FUNCTION public.enforce_onboarding_steps_candidate_locks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_candidate boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.onboarding_processes p
    WHERE p.id = OLD.process_id AND p.user_id = auth.uid()
  ) INTO is_candidate;

  IF is_candidate
     AND NOT has_role(auth.uid(), 'admin'::app_role)
     AND NOT has_role(auth.uid(), 'gestionnaire'::app_role)
     AND NOT has_role(auth.uid(), 'hr'::app_role) THEN
    IF NEW.step_key IS DISTINCT FROM OLD.step_key
       OR NEW.step_order IS DISTINCT FROM OLD.step_order
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
       OR NEW.process_id IS DISTINCT FROM OLD.process_id THEN
      RAISE EXCEPTION 'Not allowed to modify protected onboarding_steps fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onboarding_steps_candidate_locks ON public.onboarding_steps;
CREATE TRIGGER trg_onboarding_steps_candidate_locks
BEFORE UPDATE ON public.onboarding_steps
FOR EACH ROW EXECUTE FUNCTION public.enforce_onboarding_steps_candidate_locks();

-- 4) ONBOARDING_CONTRACTS: simplify policy + trigger enforcing candidate locks
DROP POLICY IF EXISTS "Candidates sign own contract" ON public.onboarding_contracts;
CREATE POLICY "Candidates sign own contract"
ON public.onboarding_contracts
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.onboarding_processes p
  WHERE p.id = onboarding_contracts.process_id AND p.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.onboarding_processes p
  WHERE p.id = onboarding_contracts.process_id AND p.user_id = auth.uid()
));

CREATE OR REPLACE FUNCTION public.enforce_onboarding_contracts_candidate_locks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_candidate boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.onboarding_processes p
    WHERE p.id = OLD.process_id AND p.user_id = auth.uid()
  ) INTO is_candidate;

  IF is_candidate
     AND NOT has_role(auth.uid(), 'admin'::app_role)
     AND NOT has_role(auth.uid(), 'gestionnaire'::app_role)
     AND NOT has_role(auth.uid(), 'hr'::app_role) THEN
    IF NEW.contract_file_path IS DISTINCT FROM OLD.contract_file_path
       OR NEW.contract_file_name IS DISTINCT FROM OLD.contract_file_name
       OR NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by
       OR NEW.uploaded_at IS DISTINCT FROM OLD.uploaded_at
       OR NEW.process_id IS DISTINCT FROM OLD.process_id
       OR NEW.notes IS DISTINCT FROM OLD.notes THEN
      RAISE EXCEPTION 'Not allowed to modify protected onboarding_contracts fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onboarding_contracts_candidate_locks ON public.onboarding_contracts;
CREATE TRIGGER trg_onboarding_contracts_candidate_locks
BEFORE UPDATE ON public.onboarding_contracts
FOR EACH ROW EXECUTE FUNCTION public.enforce_onboarding_contracts_candidate_locks();
