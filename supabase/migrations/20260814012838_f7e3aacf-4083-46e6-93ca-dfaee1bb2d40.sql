-- ============================================================
-- Générateur de formulaires marketing
-- ============================================================

CREATE TABLE public.marketing_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  internal_name text,
  description text,
  intro_text text,
  start_button_label text NOT NULL DEFAULT 'Commencer',
  status text NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon','publiee','fermee')),
  banner_variant text NOT NULL DEFAULT 'aucune' CHECK (banner_variant IN ('aucune','audit_microsoft','image')),
  banner_image_url text,
  layout text NOT NULL DEFAULT 'une_question_par_ecran' CHECK (layout IN ('une_question_par_ecran','page_unique')),
  show_progress boolean NOT NULL DEFAULT true,
  submit_label text NOT NULL DEFAULT 'Envoyer ma demande',
  confirmation_title text NOT NULL DEFAULT 'Votre demande a bien été enregistrée !',
  confirmation_text text,
  confirmation_button_label text,
  confirmation_redirect_url text,
  notification_email text,
  auto_confirmation_enabled boolean NOT NULL DEFAULT true,
  consent_required boolean NOT NULL DEFAULT true,
  consent_text text,
  score_urgent_threshold integer NOT NULL DEFAULT 60,
  score_qualified_threshold integer NOT NULL DEFAULT 35,
  closes_at timestamptz,
  max_submissions integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.marketing_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.marketing_forms(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  section text,
  field_key text NOT NULL,
  label text NOT NULL,
  help_text text,
  placeholder text,
  type text NOT NULL CHECK (type IN (
    'texte_court','texte_long','email','telephone','nombre','date','date_heure',
    'choix_unique','choix_multiple','liste_deroulante','oui_non','echelle','fichier','titre_section'
  )),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT false,
  max_selections integer,
  min_value numeric,
  max_value numeric,
  regex_validation text,
  default_value text,
  maps_to text,
  visible_when jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, field_key)
);

CREATE TABLE public.marketing_form_scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.marketing_forms(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  operator text NOT NULL CHECK (operator IN ('est','contient','superieur_a','est_rempli')),
  value jsonb NOT NULL DEFAULT '[]'::jsonb,
  points integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.marketing_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.marketing_forms(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.marketing_leads(id) ON DELETE SET NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer NOT NULL DEFAULT 0,
  priority public.marketing_lead_priority,
  completed boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mf_fields_form ON public.marketing_form_fields(form_id, position);
CREATE INDEX idx_mf_rules_form ON public.marketing_form_scoring_rules(form_id, position);
CREATE INDEX idx_mf_subs_form ON public.marketing_form_submissions(form_id, created_at DESC);

-- ---------- GRANTS ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_forms TO authenticated;
GRANT ALL ON public.marketing_forms TO service_role;
GRANT SELECT ON public.marketing_forms TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_form_fields TO authenticated;
GRANT ALL ON public.marketing_form_fields TO service_role;
GRANT SELECT ON public.marketing_form_fields TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_form_scoring_rules TO authenticated;
GRANT ALL ON public.marketing_form_scoring_rules TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_form_submissions TO authenticated;
GRANT ALL ON public.marketing_form_submissions TO service_role;

-- ---------- RLS ----------
ALTER TABLE public.marketing_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_form_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_form_submissions ENABLE ROW LEVEL SECURITY;

-- marketing_forms
CREATE POLICY "Public can read published forms"
  ON public.marketing_forms FOR SELECT TO anon, authenticated
  USING (status = 'publiee');
CREATE POLICY "Marketing members read forms"
  ON public.marketing_forms FOR SELECT TO authenticated
  USING (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing members create forms"
  ON public.marketing_forms FOR INSERT TO authenticated
  WITH CHECK (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing members update forms"
  ON public.marketing_forms FOR UPDATE TO authenticated
  USING (public.is_marketing_member(auth.uid()))
  WITH CHECK (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing managers delete forms"
  ON public.marketing_forms FOR DELETE TO authenticated
  USING (public.is_marketing_manager(auth.uid()));

-- marketing_form_fields
CREATE POLICY "Public can read fields of published forms"
  ON public.marketing_form_fields FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.marketing_forms f
    WHERE f.id = marketing_form_fields.form_id AND f.status = 'publiee'
  ));
CREATE POLICY "Marketing members read fields"
  ON public.marketing_form_fields FOR SELECT TO authenticated
  USING (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing members create fields"
  ON public.marketing_form_fields FOR INSERT TO authenticated
  WITH CHECK (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing members update fields"
  ON public.marketing_form_fields FOR UPDATE TO authenticated
  USING (public.is_marketing_member(auth.uid()))
  WITH CHECK (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing members delete fields"
  ON public.marketing_form_fields FOR DELETE TO authenticated
  USING (public.is_marketing_member(auth.uid()));

-- marketing_form_scoring_rules (never public)
CREATE POLICY "Marketing members read scoring rules"
  ON public.marketing_form_scoring_rules FOR SELECT TO authenticated
  USING (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing members create scoring rules"
  ON public.marketing_form_scoring_rules FOR INSERT TO authenticated
  WITH CHECK (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing members update scoring rules"
  ON public.marketing_form_scoring_rules FOR UPDATE TO authenticated
  USING (public.is_marketing_member(auth.uid()))
  WITH CHECK (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing members delete scoring rules"
  ON public.marketing_form_scoring_rules FOR DELETE TO authenticated
  USING (public.is_marketing_member(auth.uid()));

-- marketing_form_submissions (never public)
CREATE POLICY "Marketing members read submissions"
  ON public.marketing_form_submissions FOR SELECT TO authenticated
  USING (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing members update submissions"
  ON public.marketing_form_submissions FOR UPDATE TO authenticated
  USING (public.is_marketing_member(auth.uid()))
  WITH CHECK (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing managers delete submissions"
  ON public.marketing_form_submissions FOR DELETE TO authenticated
  USING (public.is_marketing_manager(auth.uid()));

-- ---------- updated_at triggers ----------
CREATE TRIGGER trg_marketing_forms_updated_at BEFORE UPDATE ON public.marketing_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_marketing_form_fields_updated_at BEFORE UPDATE ON public.marketing_form_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_marketing_form_scoring_rules_updated_at BEFORE UPDATE ON public.marketing_form_scoring_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_marketing_form_submissions_updated_at BEFORE UPDATE ON public.marketing_form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SEED : audit de licences Microsoft (conversion de la page codée en dur)
-- ============================================================
DO $seed$
DECLARE
  v_form_id uuid;
  v_campaign_id uuid;
  v_quote_id uuid;
BEGIN
  SELECT id INTO v_campaign_id FROM public.marketing_campaigns WHERE slug = 'audit-licences-microsoft' LIMIT 1;

  INSERT INTO public.marketing_forms (
    campaign_id, title, slug, internal_name, description, intro_text, start_button_label,
    status, banner_variant, layout, show_progress, submit_label,
    confirmation_title, confirmation_text, confirmation_button_label,
    auto_confirmation_enabled, consent_required, consent_text,
    score_urgent_threshold, score_qualified_threshold
  ) VALUES (
    v_campaign_id,
    'Audit gratuit de vos licences Microsoft',
    'audit-licences-microsoft',
    'Audit Microsoft — formulaire principal',
    'Vos licences Microsoft expirent-elles dans moins de 6 mois ? Demandez un audit gratuit.',
    'Anticipez votre renouvellement et évitez les interruptions ou les dépenses inutiles. Répondez à quelques questions pour demander un audit gratuit de vos licences Microsoft. Un conseiller Cloud Mature examinera vos échéances, vos besoins et les possibilités d''optimisation. Durée : environ 2 minutes.',
    'Commencer mon audit',
    'publiee', 'audit_microsoft', 'une_question_par_ecran', true,
    'Demander mon audit gratuit',
    'Votre demande a bien été enregistrée !',
    'Merci pour votre confiance. Un conseiller Cloud Mature vous contactera prochainement afin d''examiner vos licences, votre prochaine échéance et les possibilités d''optimisation.',
    'Visiter Cloud Mature',
    true, true,
    'J''accepte que Cloud Mature collecte et utilise les informations communiquées dans ce formulaire afin de traiter ma demande d''audit et de me contacter au sujet de ses solutions Microsoft. Je comprends que je peux retirer mon consentement à tout moment en écrivant à info@cloudmature.com.',
    60, 35
  ) RETURNING id INTO v_form_id;

  INSERT INTO public.marketing_form_fields
    (form_id, position, section, field_key, label, help_text, type, options, required, max_selections, maps_to, visible_when)
  VALUES
  (v_form_id, 1, 'Entreprise', 'company_name', 'Nom de l''entreprise', NULL, 'texte_court', '[]'::jsonb, true, NULL, 'company_name', NULL),
  (v_form_id, 2, 'Entreprise', 'sector', 'Secteur d''activité', NULL, 'choix_unique',
    '["Mines et sous-traitance minière","Banque, assurance ou microfinance","Télécommunications","Informatique et services numériques","BTP et immobilier","Transport et logistique","Commerce et distribution","Industrie","ONG ou organisation internationale","Administration publique","Santé","Éducation","Cabinet ou services professionnels","Autre"]'::jsonb,
    true, NULL, 'sector', NULL),
  (v_form_id, 3, 'Entreprise', 'city', 'Ville principale', NULL, 'liste_deroulante',
    '["Conakry","Boké","Kamsar","Kindia","Mamou","Labé","Kankan","Nzérékoré","Autre"]'::jsonb,
    true, NULL, 'city', NULL),
  (v_form_id, 4, 'Entreprise', 'employee_count_range', 'Nombre approximatif d''employés', NULL, 'choix_unique',
    '["1 à 10","11 à 25","26 à 50","51 à 100","101 à 250","Plus de 250"]'::jsonb,
    true, NULL, 'employee_count_range', NULL),
  (v_form_id, 5, 'Licences Microsoft', 'uses_microsoft', 'Utilisez-vous actuellement des produits ou licences Microsoft ?', NULL, 'choix_unique',
    '["Oui","Non","Je ne sais pas"]'::jsonb, true, NULL, 'uses_microsoft', NULL),
  (v_form_id, 6, 'Licences Microsoft', 'microsoft_products', 'Quelles solutions Microsoft utilisez-vous actuellement ?', 'Plusieurs réponses possibles.', 'choix_multiple',
    '["Microsoft 365 Business Basic","Microsoft 365 Business Standard","Microsoft 365 Business Premium","Microsoft 365 E1","Microsoft 365 E3","Microsoft 365 E5","Microsoft Azure","Windows Server","Power BI","Dynamics 365","Microsoft Copilot","Exchange Online","Teams","SharePoint ou OneDrive","Autre","Je ne connais pas les licences utilisées"]'::jsonb,
    true, NULL, 'microsoft_products', '{"field_key":"uses_microsoft","operator":"est","values":["Oui"]}'::jsonb),
  (v_form_id, 7, 'Licences Microsoft', 'users_to_cover', 'Combien d''utilisateurs doivent être couverts par les licences ?', NULL, 'choix_unique',
    '["1 à 10","11 à 25","26 à 50","51 à 100","101 à 250","Plus de 250","Je ne sais pas encore"]'::jsonb,
    true, NULL, 'users_to_cover', NULL),
  (v_form_id, 8, 'Licences Microsoft', 'renewal_timeline', 'Quand vos licences doivent-elles être renouvelées ?', NULL, 'choix_unique',
    '["Dans moins de 30 jours","Dans 1 à 3 mois","Dans 4 à 6 mois","Dans 7 à 12 mois","Dans plus de 12 mois","Je ne connais pas la date","Je n''ai pas encore de licences"]'::jsonb,
    true, NULL, 'renewal_timeline', NULL),
  (v_form_id, 9, 'Licences Microsoft', 'has_current_provider', 'Avez-vous actuellement un fournisseur de licences Microsoft ?', NULL, 'choix_unique',
    '["Oui","Non","Je ne sais pas","Je préfère ne pas répondre"]'::jsonb, true, NULL, 'has_current_provider', NULL),
  (v_form_id, 10, 'Licences Microsoft', 'main_needs', 'Quel est votre principal besoin ?', '3 réponses maximum.', 'choix_multiple',
    '["Renouveler mes licences","Acheter de nouvelles licences","Réduire mes coûts","Vérifier les licences inutilisées","Choisir une formule adaptée","Migrer vers Microsoft 365","Améliorer la sécurité","Sauvegarder et protéger mes données","Déployer Microsoft Copilot","Migrer vers Azure","Obtenir du support technique","Recevoir un devis","Obtenir des conseils"]'::jsonb,
    true, 3, 'main_needs', NULL),
  (v_form_id, 11, 'Licences Microsoft', 'additional_info', 'Informations complémentaires', 'Décrivez brièvement votre environnement, vos difficultés ou votre projet.', 'texte_long',
    '[]'::jsonb, false, NULL, 'additional_info', NULL),
  (v_form_id, 12, 'Personne à contacter', 'full_name', 'Prénom et nom', NULL, 'texte_court', '[]'::jsonb, true, NULL, 'full_name', NULL),
  (v_form_id, 13, 'Personne à contacter', 'job_title', 'Fonction', NULL, 'choix_unique',
    '["Directeur général","Directeur informatique ou DSI","Responsable informatique","Directeur administratif et financier","Responsable administratif","Responsable des achats","Responsable des ressources humaines","Consultant ou prestataire","Autre"]'::jsonb,
    true, NULL, 'job_title', NULL),
  (v_form_id, 14, 'Personne à contacter', 'email', 'Adresse e-mail professionnelle', NULL, 'email', '[]'::jsonb, true, NULL, 'email', NULL),
  (v_form_id, 15, 'Personne à contacter', 'phone', 'Numéro de téléphone ou WhatsApp', NULL, 'telephone', '[]'::jsonb, true, NULL, 'phone', NULL),
  (v_form_id, 16, 'Personne à contacter', 'preferred_contact_method', 'Moyen de contact préféré', NULL, 'choix_unique',
    '["Téléphone","WhatsApp","E-mail","Visioconférence Microsoft Teams"]'::jsonb, true, NULL, 'preferred_contact_method', NULL),
  (v_form_id, 17, 'Personne à contacter', 'contact_timing', 'Quand souhaitez-vous être contacté ?', NULL, 'choix_unique',
    '["Dès que possible","Dans les 24 heures","Dans les 48 heures","Cette semaine","À une date précise"]'::jsonb, true, NULL, 'contact_timing', NULL),
  (v_form_id, 18, 'Personne à contacter', 'preferred_datetime', 'Choisissez une date et une heure', NULL, 'date_heure',
    '[]'::jsonb, true, NULL, 'preferred_datetime', '{"field_key":"contact_timing","operator":"est","values":["À une date précise"]}'::jsonb);

  INSERT INTO public.marketing_form_scoring_rules (form_id, field_key, operator, value, points, label, position) VALUES
  (v_form_id, 'renewal_timeline', 'est', '["Dans moins de 30 jours"]'::jsonb, 40, 'Renouvellement dans moins de 30 jours', 1),
  (v_form_id, 'renewal_timeline', 'est', '["Dans 1 à 3 mois"]'::jsonb, 30, 'Renouvellement dans 1 à 3 mois', 2),
  (v_form_id, 'renewal_timeline', 'est', '["Dans 4 à 6 mois"]'::jsonb, 20, 'Renouvellement dans 4 à 6 mois', 3),
  (v_form_id, 'users_to_cover', 'est', '["51 à 100","101 à 250","Plus de 250"]'::jsonb, 20, 'Plus de 50 utilisateurs à couvrir', 4),
  (v_form_id, 'main_needs', 'contient', '["Recevoir un devis"]'::jsonb, 15, 'Besoin : Recevoir un devis', 5),
  (v_form_id, 'main_needs', 'contient', '["Renouveler mes licences"]'::jsonb, 15, 'Besoin : Renouveler mes licences', 6),
  (v_form_id, 'main_needs', 'contient', '["Réduire mes coûts"]'::jsonb, 10, 'Besoin : Réduire mes coûts', 7),
  (v_form_id, 'job_title', 'est', '["Directeur informatique ou DSI","Responsable informatique","Directeur général","Directeur administratif et financier","Responsable des achats"]'::jsonb, 15, 'Fonction décisionnaire', 8);

  -- ---------- Second formulaire : démonstration en brouillon ----------
  INSERT INTO public.marketing_forms (
    title, slug, internal_name, description, intro_text, start_button_label,
    status, banner_variant, layout, show_progress, submit_label,
    confirmation_title, confirmation_text,
    auto_confirmation_enabled, consent_required, consent_text,
    score_urgent_threshold, score_qualified_threshold
  ) VALUES (
    'Demande de devis — Microsoft 365',
    'demande-devis-microsoft-365',
    'Devis M365 — démonstration',
    'Formulaire court pour recevoir une proposition tarifaire Microsoft 365.',
    'Quelques questions suffisent pour préparer votre proposition tarifaire Microsoft 365. Durée : moins d''une minute.',
    'Demander mon devis',
    'brouillon', 'aucune', 'une_question_par_ecran', true,
    'Recevoir ma proposition',
    'Votre demande de devis est enregistrée',
    'Notre équipe commerciale prépare votre proposition et revient vers vous sous 48 heures ouvrées.',
    true, true,
    'J''accepte que Cloud Mature collecte et utilise les informations communiquées dans ce formulaire afin de préparer ma proposition tarifaire et de me contacter à ce sujet.',
    40, 20
  ) RETURNING id INTO v_quote_id;

  INSERT INTO public.marketing_form_fields
    (form_id, position, section, field_key, label, help_text, type, options, required, maps_to)
  VALUES
  (v_quote_id, 1, 'Entreprise', 'company_name', 'Nom de l''entreprise', NULL, 'texte_court', '[]'::jsonb, true, 'company_name'),
  (v_quote_id, 2, 'Entreprise', 'users_to_cover', 'Combien de licences souhaitez-vous ?', NULL, 'choix_unique',
    '["1 à 10","11 à 25","26 à 50","51 à 100","101 à 250","Plus de 250"]'::jsonb, true, 'users_to_cover'),
  (v_quote_id, 3, 'Entreprise', 'main_needs', 'Quelles formules vous intéressent ?', '3 réponses maximum.', 'choix_multiple',
    '["Microsoft 365 Business Basic","Microsoft 365 Business Standard","Microsoft 365 Business Premium","Microsoft 365 E3","Microsoft 365 E5","Je ne sais pas encore"]'::jsonb, true, 'main_needs'),
  (v_quote_id, 4, 'Contact', 'full_name', 'Prénom et nom', NULL, 'texte_court', '[]'::jsonb, true, 'full_name'),
  (v_quote_id, 5, 'Contact', 'email', 'Adresse e-mail professionnelle', NULL, 'email', '[]'::jsonb, true, 'email'),
  (v_quote_id, 6, 'Contact', 'phone', 'Téléphone ou WhatsApp', NULL, 'telephone', '[]'::jsonb, true, 'phone'),
  (v_quote_id, 7, 'Contact', 'additional_info', 'Précisions utiles', NULL, 'texte_long', '[]'::jsonb, false, 'additional_info');

  INSERT INTO public.marketing_form_scoring_rules (form_id, field_key, operator, value, points, label, position) VALUES
  (v_quote_id, 'users_to_cover', 'est', '["51 à 100","101 à 250","Plus de 250"]'::jsonb, 25, 'Volume supérieur à 50 licences', 1),
  (v_quote_id, 'main_needs', 'contient', '["Microsoft 365 E5"]'::jsonb, 20, 'Intérêt pour Microsoft 365 E5', 2),
  (v_quote_id, 'main_needs', 'contient', '["Microsoft 365 Business Premium"]'::jsonb, 15, 'Intérêt pour Business Premium', 3);
END
$seed$;