
-- 1. user_roles: explicit UPDATE policy (admin only)
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. payment_methods: explicit deny-all SELECT for non-privileged via RESTRICTIVE policy
-- Existing policies already restrict reads (only admin/comptable/gestionnaire have ALL,
-- and assigned invoice users have a scoped SELECT). Add a RESTRICTIVE policy as defense-in-depth.
CREATE POLICY "Restrict payment methods reads"
ON public.payment_methods AS RESTRICTIVE FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'comptable'::app_role)
  OR public.has_role(auth.uid(), 'gestionnaire'::app_role)
  OR public.is_client_for_assigned_invoice(payment_methods.id, auth.uid())
);

-- 3. Remove the path-traversal-prone public CV upload policy
DROP POLICY IF EXISTS "Anyone can upload public CVs" ON storage.objects;

-- 4. Tighten email-assets SELECT policy to avoid bucket listing of "naked" entries.
DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;
CREATE POLICY "Email assets are publicly accessible"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'email-assets'
  AND name IS NOT NULL
  AND name ~ '\.[A-Za-z0-9]+$'
);

-- 5. realtime.messages: deny broadcast subscriptions by default
DO $$ BEGIN
  EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated only broadcast" ON realtime.messages';
  EXECUTE 'CREATE POLICY "Authenticated only broadcast" ON realtime.messages
           FOR SELECT TO authenticated USING (false)';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

-- 6. Tighten always-true permissive policies (non service-role)
DROP POLICY IF EXISTS "Anyone can submit contact requests" ON public.contact_requests;
CREATE POLICY "Anyone can submit contact requests"
ON public.contact_requests FOR INSERT
WITH CHECK (
  name IS NOT NULL AND length(trim(name)) BETWEEN 1 AND 200
  AND email IS NOT NULL AND length(trim(email)) BETWEEN 3 AND 320
);

DROP POLICY IF EXISTS "Anyone can submit applications" ON public.job_applications;
CREATE POLICY "Anyone can submit applications"
ON public.job_applications FOR INSERT
WITH CHECK (
  full_name IS NOT NULL AND length(trim(full_name)) BETWEEN 1 AND 200
  AND email IS NOT NULL AND length(trim(email)) BETWEEN 3 AND 320
  AND job_id IS NOT NULL
);

-- 7. Rewrite "service_role only" always-true policies with an explicit role check
DROP POLICY IF EXISTS "Service role manages certificates" ON public.training_certificates;
CREATE POLICY "Service role manages certificates"
ON public.training_certificates AS PERMISSIVE FOR ALL TO service_role
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role only" ON public.verify_attempts;
CREATE POLICY "Service role only"
ON public.verify_attempts AS PERMISSIVE FOR ALL TO service_role
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.subscriptions;
CREATE POLICY "Service role manages subscriptions"
ON public.subscriptions AS PERMISSIVE FOR ALL TO service_role
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages all" ON public.cinetpay_transactions;
CREATE POLICY "Service role manages all"
ON public.cinetpay_transactions AS PERMISSIVE FOR ALL TO service_role
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages MFA verifications" ON public.mfa_verifications;
CREATE POLICY "Service role manages MFA verifications"
ON public.mfa_verifications AS PERMISSIVE FOR ALL TO service_role
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 8. Lock down SECURITY DEFINER functions in public schema
-- Revoke EXECUTE from anon broadly; grant back only public-facing helpers.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', r.sig);
  END LOOP;
END $$;

-- Re-grant anon access to the few public-facing RPCs
GRANT EXECUTE ON FUNCTION public.get_job_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_job_application(uuid, text, text, text, uuid, text, text, text, text, text) TO anon, authenticated;

-- Revoke EXECUTE from authenticated on trigger-only / service-only functions
DO $$
DECLARE
  trigger_only text[] := ARRAY[
    'public.handle_new_user()',
    'public.handle_new_user_role()',
    'public.handle_new_user_onboarding()',
    'public.handle_application_accepted()',
    'public.notify_application_status_change()',
    'public.notify_application_created()',
    'public.notify_training_assignment()',
    'public.trigger_cv_analysis()',
    'public.on_training_completed_gamify()',
    'public.recalc_onboarding_progress()',
    'public.recalculate_project_paid()',
    'public.set_service_invoice_number()',
    'public.set_project_number()',
    'public.set_ticket_number()',
    'public.set_application_tracking_id()',
    'public.set_cinetpay_transaction_id()',
    'public.check_invoice_overdue()',
    'public.propagate_group_member_trainings()',
    'public.propagate_group_training_assignment()',
    'public.auto_assign_trainings_by_department()',
    'public.protect_training_grading_fields()',
    'public.update_updated_at_column()',
    'public.award_badge(uuid, text, text, text)',
    'public.sync_premium_role_for_user(uuid)',
    'public.move_to_dlq(text, text, bigint, jsonb)',
    'public.enqueue_email(text, jsonb)',
    'public.read_email_batch(text, integer, integer)',
    'public.delete_email(text, bigint)',
    'public.generate_service_invoice_number()',
    'public.generate_project_number()',
    'public.generate_ticket_number()',
    'public.generate_application_tracking_id()',
    'public.generate_cinetpay_transaction_id()',
    'public.assign_training_to_all_users(uuid)'
  ];
  s text;
BEGIN
  FOREACH s IN ARRAY trigger_only LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated, anon, PUBLIC', s);
    EXCEPTION WHEN undefined_function THEN NULL; END;
  END LOOP;
END $$;
