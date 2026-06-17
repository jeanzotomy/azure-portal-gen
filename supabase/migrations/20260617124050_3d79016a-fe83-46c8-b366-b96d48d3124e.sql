
-- 1) Anonymous CV uploads: require unique subdirectory under public/
DROP POLICY IF EXISTS "Anyone can upload public CVs" ON storage.objects;
CREATE POLICY "Anyone can upload public CVs"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'cv-applications'
    AND (storage.foldername(name))[1] = 'public'
    AND COALESCE(array_length(storage.foldername(name), 1), 0) >= 3
    AND length(COALESCE((storage.foldername(name))[3], '')) >= 16
  );

-- 2) Lock sensitive grading columns from candidate UPDATE
REVOKE UPDATE (quiz_score, quiz_passed, completed_at, quiz_submitted_at, quiz_time_seconds, quiz_open_grades)
  ON public.onboarding_assigned_trainings FROM authenticated, anon;

-- 3) Explicit admin-only write policies on payment_provider_settings
DROP POLICY IF EXISTS "Admins insert provider settings" ON public.payment_provider_settings;
DROP POLICY IF EXISTS "Admins update provider settings" ON public.payment_provider_settings;
DROP POLICY IF EXISTS "Admins delete provider settings" ON public.payment_provider_settings;
CREATE POLICY "Admins insert provider settings" ON public.payment_provider_settings
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update provider settings" ON public.payment_provider_settings
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete provider settings" ON public.payment_provider_settings
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 5) Revoke direct quiz column read; HR/admins use get_training_quiz() RPC
REVOKE SELECT (quiz) ON public.trainings FROM authenticated, anon;
