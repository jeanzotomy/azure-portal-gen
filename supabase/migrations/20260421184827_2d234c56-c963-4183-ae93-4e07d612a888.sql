-- Enums
CREATE TYPE public.job_status AS ENUM ('brouillon', 'publiee', 'fermee');
CREATE TYPE public.contract_type AS ENUM ('CDI', 'CDD', 'Stage', 'Freelance', 'Alternance');
CREATE TYPE public.application_status AS ENUM ('nouvelle', 'en_revue', 'entretien', 'acceptee', 'refusee');

-- Job postings table
CREATE TABLE public.job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT,
  location TEXT NOT NULL,
  contract_type contract_type NOT NULL DEFAULT 'CDI',
  description TEXT NOT NULL,
  closing_date DATE,
  status job_status NOT NULL DEFAULT 'brouillon',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published jobs"
  ON public.job_postings FOR SELECT
  USING (status = 'publiee');

CREATE POLICY "Admins manage job postings"
  ON public.job_postings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestionnaires manage job postings"
  ON public.job_postings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'gestionnaire'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));

CREATE TRIGGER update_job_postings_updated_at
  BEFORE UPDATE ON public.job_postings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Job applications table
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  years_experience INTEGER,
  salary_expectation TEXT,
  cv_path TEXT NOT NULL,
  cover_letter_path TEXT,
  status application_status NOT NULL DEFAULT 'nouvelle',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit own applications"
  ON public.job_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own applications"
  ON public.job_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage applications"
  ON public.job_applications FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestionnaires manage applications"
  ON public.job_applications FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'gestionnaire'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestionnaire'::app_role));

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for CVs
INSERT INTO storage.buckets (id, name, public) VALUES ('cv-applications', 'cv-applications', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own CVs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cv-applications' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own CVs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'cv-applications' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins read all CVs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'cv-applications' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestionnaires read all CVs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'cv-applications' AND has_role(auth.uid(), 'gestionnaire'::app_role));