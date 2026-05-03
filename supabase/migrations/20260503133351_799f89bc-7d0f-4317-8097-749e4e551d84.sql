-- Add onboarding role to existing enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'onboarding';

-- Enums for onboarding
DO $$ BEGIN
  CREATE TYPE public.onboarding_status AS ENUM ('en_cours', 'complete', 'abandonne');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.onboarding_step_status AS ENUM ('a_faire', 'en_cours', 'en_revision', 'valide', 'refuse');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.onboarding_doc_type AS ENUM ('cni', 'rib', 'diplome', 'photo_casier', 'contrat_signe', 'autre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Main process table
CREATE TABLE public.onboarding_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  user_id UUID,
  candidate_email TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  job_id UUID,
  status public.onboarding_status NOT NULL DEFAULT 'en_cours',
  current_step INT NOT NULL DEFAULT 1,
  start_date DATE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_onboarding_application ON public.onboarding_processes(application_id);
CREATE INDEX idx_onboarding_user ON public.onboarding_processes(user_id);

-- Steps
CREATE TABLE public.onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.onboarding_processes(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.onboarding_step_status NOT NULL DEFAULT 'a_faire',
  data JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_onb_steps_process ON public.onboarding_steps(process_id);

-- Documents uploaded by candidate
CREATE TABLE public.onboarding_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.onboarding_processes(id) ON DELETE CASCADE,
  doc_type public.onboarding_doc_type NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  status public.onboarding_step_status NOT NULL DEFAULT 'en_revision',
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID
);
CREATE INDEX idx_onb_docs_process ON public.onboarding_documents(process_id);

-- Contracts (RH uploads PDF, candidate signs)
CREATE TABLE public.onboarding_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.onboarding_processes(id) ON DELETE CASCADE,
  contract_file_path TEXT NOT NULL,
  contract_file_name TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature_url TEXT,
  signed_at TIMESTAMPTZ,
  signed_pdf_path TEXT,
  notes TEXT
);
CREATE INDEX idx_onb_contracts_process ON public.onboarding_contracts(process_id);

-- Messages chat
CREATE TABLE public.onboarding_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.onboarding_processes(id) ON DELETE CASCADE,
  sender_id UUID,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_onb_msg_process ON public.onboarding_messages(process_id);

-- Enable RLS
ALTER TABLE public.onboarding_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_messages ENABLE ROW LEVEL SECURITY;

-- RLS: processes
CREATE POLICY "Admins manage onboarding processes" ON public.onboarding_processes
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Gestionnaires manage onboarding processes" ON public.onboarding_processes
  FOR ALL TO authenticated USING (has_role(auth.uid(),'gestionnaire')) WITH CHECK (has_role(auth.uid(),'gestionnaire'));
CREATE POLICY "Candidates view own process" ON public.onboarding_processes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- RLS: steps
CREATE POLICY "Admins manage onboarding steps" ON public.onboarding_steps
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Gestionnaires manage onboarding steps" ON public.onboarding_steps
  FOR ALL TO authenticated USING (has_role(auth.uid(),'gestionnaire')) WITH CHECK (has_role(auth.uid(),'gestionnaire'));
CREATE POLICY "Candidates view own steps" ON public.onboarding_steps
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.onboarding_processes p WHERE p.id = process_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Candidates update own steps data" ON public.onboarding_steps
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.onboarding_processes p WHERE p.id = process_id AND p.user_id = auth.uid())
  );

-- RLS: documents
CREATE POLICY "Admins manage onboarding docs" ON public.onboarding_documents
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Gestionnaires manage onboarding docs" ON public.onboarding_documents
  FOR ALL TO authenticated USING (has_role(auth.uid(),'gestionnaire')) WITH CHECK (has_role(auth.uid(),'gestionnaire'));
CREATE POLICY "Candidates view own docs" ON public.onboarding_documents
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.onboarding_processes p WHERE p.id = process_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Candidates upload own docs" ON public.onboarding_documents
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.onboarding_processes p WHERE p.id = process_id AND p.user_id = auth.uid())
  );

-- RLS: contracts
CREATE POLICY "Admins manage onboarding contracts" ON public.onboarding_contracts
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Gestionnaires manage onboarding contracts" ON public.onboarding_contracts
  FOR ALL TO authenticated USING (has_role(auth.uid(),'gestionnaire')) WITH CHECK (has_role(auth.uid(),'gestionnaire'));
CREATE POLICY "Candidates view own contract" ON public.onboarding_contracts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.onboarding_processes p WHERE p.id = process_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Candidates sign own contract" ON public.onboarding_contracts
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.onboarding_processes p WHERE p.id = process_id AND p.user_id = auth.uid())
  );

-- RLS: messages
CREATE POLICY "Admins manage onboarding messages" ON public.onboarding_messages
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Gestionnaires manage onboarding messages" ON public.onboarding_messages
  FOR ALL TO authenticated USING (has_role(auth.uid(),'gestionnaire')) WITH CHECK (has_role(auth.uid(),'gestionnaire'));
CREATE POLICY "Candidates view own messages" ON public.onboarding_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.onboarding_processes p WHERE p.id = process_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Candidates send own messages" ON public.onboarding_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND is_admin = false
    AND EXISTS (SELECT 1 FROM public.onboarding_processes p WHERE p.id = process_id AND p.user_id = auth.uid())
  );

-- updated_at triggers
CREATE TRIGGER trg_onb_proc_updated BEFORE UPDATE ON public.onboarding_processes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_onb_steps_updated BEFORE UPDATE ON public.onboarding_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function: create onboarding process for a job application
CREATE OR REPLACE FUNCTION public.create_onboarding_for_application(_application_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proc_id UUID;
  v_app RECORD;
BEGIN
  SELECT a.*, j.title AS job_title INTO v_app
  FROM public.job_applications a
  LEFT JOIN public.job_postings j ON j.id = a.job_id
  WHERE a.id = _application_id;

  IF v_app IS NULL THEN
    RAISE EXCEPTION 'Application introuvable';
  END IF;

  -- Idempotent
  SELECT id INTO v_proc_id FROM public.onboarding_processes WHERE application_id = _application_id;
  IF v_proc_id IS NOT NULL THEN
    RETURN v_proc_id;
  END IF;

  INSERT INTO public.onboarding_processes (application_id, user_id, candidate_email, candidate_name, job_id)
  VALUES (_application_id, v_app.user_id, v_app.email, v_app.full_name, v_app.job_id)
  RETURNING id INTO v_proc_id;

  -- Seed 7 steps
  INSERT INTO public.onboarding_steps (process_id, step_order, step_key, title, description) VALUES
    (v_proc_id, 1, 'welcome',     'Bienvenue chez CloudMature', 'Découvrez l''entreprise, l''équipe et votre futur poste.'),
    (v_proc_id, 2, 'contract',    'Signature du contrat',        'Téléchargez et signez électroniquement votre contrat.'),
    (v_proc_id, 3, 'documents',   'Documents administratifs',    'CNI/Passeport, RIB/Mobile Money, Diplômes, Photo & Casier.'),
    (v_proc_id, 4, 'training',    'Formation & Quiz d''intégration', 'Modules vidéo et quiz pour valider les essentiels.'),
    (v_proc_id, 5, 'it_account',  'Compte SI & Outils',          'Création de votre email pro et accès aux outils internes.'),
    (v_proc_id, 6, 'team_meet',   'Rencontre avec l''équipe',     'Visio de bienvenue avec votre manager et vos collègues.'),
    (v_proc_id, 7, 'day_one',     'Jour J',                      'Tout ce qu''il faut savoir pour votre premier jour.');

  RETURN v_proc_id;
END;
$$;

-- Trigger: on application acceptance, create onboarding + notify
CREATE OR REPLACE FUNCTION public.handle_application_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url TEXT := 'https://zwzazxebufydnaxezngx.supabase.co/functions/v1/onboarding-invite';
  v_key TEXT;
  v_proc_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'acceptee' THEN
    v_proc_id := public.create_onboarding_for_application(NEW.id);

    BEGIN
      SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'app_service_role_key' LIMIT 1;
    EXCEPTION WHEN OTHERS THEN v_key := NULL; END;

    PERFORM net.http_post(
      url := v_url,
      body := jsonb_build_object('process_id', v_proc_id, 'application_id', NEW.id),
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || COALESCE(v_key,''))
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_accepted ON public.job_applications;
CREATE TRIGGER trg_application_accepted
AFTER UPDATE ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.handle_application_accepted();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('onboarding-files', 'onboarding-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: candidate accesses files under their process_id folder
CREATE POLICY "Candidates upload own onboarding files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-files'
  AND EXISTS (
    SELECT 1 FROM public.onboarding_processes p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Candidates view own onboarding files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'onboarding-files'
  AND (
    EXISTS (
      SELECT 1 FROM public.onboarding_processes p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.user_id = auth.uid()
    )
    OR has_role(auth.uid(),'admin')
    OR has_role(auth.uid(),'gestionnaire')
  )
);

CREATE POLICY "Admins manage onboarding files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'onboarding-files' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestionnaire')))
WITH CHECK (bucket_id = 'onboarding-files' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestionnaire')));