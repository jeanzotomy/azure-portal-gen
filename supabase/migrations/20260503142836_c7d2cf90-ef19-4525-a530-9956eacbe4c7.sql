-- 1. Backfill: link orphan job_applications to existing auth users by email
UPDATE public.job_applications ja
SET user_id = u.id
FROM auth.users u
WHERE ja.user_id IS NULL
  AND LOWER(ja.email) = LOWER(u.email);

-- 2. Backfill: link orphan onboarding_processes
UPDATE public.onboarding_processes op
SET user_id = u.id
FROM auth.users u
WHERE op.user_id IS NULL
  AND LOWER(op.candidate_email) = LOWER(u.email);

-- 3. Extend handle_new_user_onboarding to also link job_applications
CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_proc_id UUID;
BEGIN
  -- Link any orphan job applications submitted with this email
  UPDATE public.job_applications
  SET user_id = NEW.id
  WHERE user_id IS NULL
    AND LOWER(email) = LOWER(NEW.email);

  -- Link any orphan onboarding process(es)
  UPDATE public.onboarding_processes
  SET user_id = NEW.id
  WHERE user_id IS NULL
    AND LOWER(candidate_email) = LOWER(NEW.email);

  -- If an onboarding process now belongs to this user, give them onboarding role
  SELECT id INTO v_proc_id
  FROM public.onboarding_processes
  WHERE user_id = NEW.id
  LIMIT 1;

  IF v_proc_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'onboarding')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Make sure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_onboarding ON auth.users;
CREATE TRIGGER on_auth_user_created_onboarding
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_onboarding();

-- 5. RLS: allow a user to see job_applications matching their auth email even if user_id is null
CREATE POLICY "Users view applications matching their email"
ON public.job_applications
FOR SELECT
TO authenticated
USING (
  LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
);