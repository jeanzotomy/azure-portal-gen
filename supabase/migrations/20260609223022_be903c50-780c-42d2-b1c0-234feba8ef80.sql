
CREATE TABLE public.training_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  assigned_id UUID REFERENCES public.onboarding_assigned_trainings(id) ON DELETE SET NULL,
  verification_code TEXT NOT NULL UNIQUE,
  candidate_name TEXT NOT NULL,
  training_title TEXT NOT NULL,
  score INT,
  pdf_path TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, training_id)
);

CREATE INDEX idx_training_certificates_user ON public.training_certificates(user_id);
CREATE INDEX idx_training_certificates_code ON public.training_certificates(verification_code);

GRANT SELECT ON public.training_certificates TO anon;
GRANT SELECT ON public.training_certificates TO authenticated;
GRANT ALL ON public.training_certificates TO service_role;

ALTER TABLE public.training_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can verify certificates"
  ON public.training_certificates FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role manages certificates"
  ON public.training_certificates FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
