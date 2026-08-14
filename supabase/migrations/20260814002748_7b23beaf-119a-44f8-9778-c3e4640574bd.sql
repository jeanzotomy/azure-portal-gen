-- ENUMS
CREATE TYPE public.marketing_campaign_type AS ENUM ('annonce','promotion','evenement','formulaire_qualification');
CREATE TYPE public.marketing_campaign_status AS ENUM ('brouillon','planifiee','publiee','terminee','archivee');
CREATE TYPE public.marketing_lead_priority AS ENUM ('urgent','qualifie','a_entretenir');
CREATE TYPE public.marketing_lead_status AS ENUM ('nouveau','contacte','qualifie','devis_envoye','gagne','perdu','sans_suite');
CREATE TYPE public.lead_activity_type AS ENUM ('note','appel','email','whatsapp','rendez_vous','changement_statut');

CREATE OR REPLACE FUNCTION public.is_marketing_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.has_role(_user_id,'gestionnaire') OR public.has_role(_user_id,'agent')
$$;

CREATE OR REPLACE FUNCTION public.is_marketing_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.has_role(_user_id,'gestionnaire')
$$;

CREATE TABLE public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  type public.marketing_campaign_type NOT NULL DEFAULT 'annonce',
  status public.marketing_campaign_status NOT NULL DEFAULT 'brouillon',
  short_description text,
  content text,
  cover_image_url text,
  cta_label text,
  cta_url text,
  start_date timestamptz,
  end_date timestamptz,
  channels text[] NOT NULL DEFAULT '{}',
  target_audience text,
  planned_budget numeric,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT SELECT ON public.marketing_campaigns TO anon;
GRANT ALL ON public.marketing_campaigns TO service_role;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published campaigns are public" ON public.marketing_campaigns FOR SELECT TO anon, authenticated USING (status = 'publiee');
CREATE POLICY "Marketing team reads all campaigns" ON public.marketing_campaigns FOR SELECT TO authenticated USING (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing team creates campaigns" ON public.marketing_campaigns FOR INSERT TO authenticated WITH CHECK (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing team updates campaigns" ON public.marketing_campaigns FOR UPDATE TO authenticated USING (public.is_marketing_member(auth.uid())) WITH CHECK (public.is_marketing_member(auth.uid()));
CREATE POLICY "Managers delete campaigns" ON public.marketing_campaigns FOR DELETE TO authenticated USING (public.is_marketing_manager(auth.uid()));

CREATE TABLE public.marketing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'formulaire_audit_microsoft',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  company_name text NOT NULL,
  sector text,
  city text,
  employee_count_range text,
  uses_microsoft text,
  microsoft_products text[] NOT NULL DEFAULT '{}',
  users_to_cover text,
  renewal_timeline text,
  has_current_provider text,
  main_needs text[] NOT NULL DEFAULT '{}',
  additional_info text,
  full_name text NOT NULL,
  job_title text,
  email text NOT NULL,
  phone text,
  preferred_contact_method text,
  contact_timing text,
  preferred_datetime timestamptz,
  consent_given boolean NOT NULL DEFAULT false,
  consent_text text,
  consent_timestamp timestamptz,
  consent_ip text,
  score integer NOT NULL DEFAULT 0,
  priority public.marketing_lead_priority NOT NULL DEFAULT 'a_entretenir',
  score_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.marketing_lead_status NOT NULL DEFAULT 'nouveau',
  assigned_to uuid,
  next_action_at timestamptz,
  lost_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_leads TO authenticated;
GRANT ALL ON public.marketing_leads TO service_role;
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Marketing team reads leads" ON public.marketing_leads FOR SELECT TO authenticated USING (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing team creates leads" ON public.marketing_leads FOR INSERT TO authenticated WITH CHECK (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing team updates leads" ON public.marketing_leads FOR UPDATE TO authenticated USING (public.is_marketing_member(auth.uid())) WITH CHECK (public.is_marketing_member(auth.uid()));
CREATE POLICY "Managers delete leads" ON public.marketing_leads FOR DELETE TO authenticated USING (public.is_marketing_manager(auth.uid()));
CREATE INDEX idx_marketing_leads_created ON public.marketing_leads (created_at DESC);
CREATE INDEX idx_marketing_leads_priority ON public.marketing_leads (priority);
CREATE INDEX idx_marketing_leads_status ON public.marketing_leads (status);

CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.marketing_leads(id) ON DELETE CASCADE,
  user_id uuid,
  type public.lead_activity_type NOT NULL DEFAULT 'note',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Marketing team reads activities" ON public.lead_activities FOR SELECT TO authenticated USING (public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing team writes activities" ON public.lead_activities FOR INSERT TO authenticated WITH CHECK (public.is_marketing_member(auth.uid()) AND user_id = auth.uid());
CREATE INDEX idx_lead_activities_lead ON public.lead_activities (lead_id, created_at DESC);

CREATE TABLE public.campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  type text NOT NULL,
  lead_id uuid REFERENCES public.marketing_leads(id) ON DELETE SET NULL,
  source text,
  utm jsonb,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campaign_events TO authenticated;
GRANT INSERT ON public.campaign_events TO anon, authenticated;
GRANT ALL ON public.campaign_events TO service_role;
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record campaign events" ON public.campaign_events FOR INSERT TO anon, authenticated WITH CHECK (type IN ('view','start','submit') AND lead_id IS NULL);
CREATE POLICY "Marketing team reads campaign events" ON public.campaign_events FOR SELECT TO authenticated USING (public.is_marketing_member(auth.uid()));
CREATE INDEX idx_campaign_events_campaign ON public.campaign_events (campaign_id, type);

CREATE TABLE public.marketing_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  notification_email text NOT NULL DEFAULT 'info@cloudmature.com',
  auto_confirmation_enabled boolean NOT NULL DEFAULT true,
  score_urgent_threshold integer NOT NULL DEFAULT 60,
  score_qualified_threshold integer NOT NULL DEFAULT 35,
  sales_user_ids uuid[] NOT NULL DEFAULT '{}',
  consent_text text NOT NULL DEFAULT 'J''accepte que Cloud Mature collecte et utilise les informations communiquées dans ce formulaire afin de traiter ma demande d''audit et de me contacter au sujet de ses solutions Microsoft. Je comprends que je peux retirer mon consentement à tout moment en écrivant à info@cloudmature.com.',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.marketing_settings TO authenticated;
GRANT ALL ON public.marketing_settings TO service_role;
ALTER TABLE public.marketing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Marketing team reads settings" ON public.marketing_settings FOR SELECT TO authenticated USING (public.is_marketing_member(auth.uid()));
CREATE POLICY "Managers insert settings" ON public.marketing_settings FOR INSERT TO authenticated WITH CHECK (public.is_marketing_manager(auth.uid()));
CREATE POLICY "Managers update settings" ON public.marketing_settings FOR UPDATE TO authenticated USING (public.is_marketing_manager(auth.uid())) WITH CHECK (public.is_marketing_manager(auth.uid()));
INSERT INTO public.marketing_settings (id) VALUES (1);

CREATE TABLE public.lead_submission_attempts (
  id bigserial PRIMARY KEY,
  ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.lead_submission_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.lead_submission_attempts_id_seq TO service_role;
ALTER TABLE public.lead_submission_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_lead_attempts_ip ON public.lead_submission_attempts (ip, created_at DESC);

CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketing_leads_updated_at BEFORE UPDATE ON public.marketing_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for the 'marketing' bucket (images readable by everyone, uploads restricted)
CREATE POLICY "Public read marketing images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'marketing' AND (lower(right(name, 5)) = '.jpeg' OR lower(right(name, 4)) IN ('.png','.jpg','.gif','.svg','webp','avif')));
CREATE POLICY "Marketing team uploads images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'marketing' AND public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing team updates images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'marketing' AND public.is_marketing_member(auth.uid()));
CREATE POLICY "Marketing team deletes images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'marketing' AND public.is_marketing_manager(auth.uid()));

-- DEMO DATA
INSERT INTO public.marketing_campaigns (title, slug, type, status, short_description, content, cta_label, cta_url, start_date, end_date, channels, target_audience, planned_budget)
VALUES
('Audit gratuit de vos licences Microsoft','audit-licences-microsoft','formulaire_qualification','publiee',
 'Vos licences Microsoft expirent dans moins de 6 mois ? Demandez un audit gratuit.',
 'Cloud Mature analyse vos échéances, vos usages réels et vos possibilités d''optimisation. Un conseiller vous recontacte sous 48 heures avec un plan de renouvellement clair.',
 'Commencer mon audit','/audit-licences-microsoft', now() - interval '10 days', now() + interval '80 days',
 ARRAY['site_web','email','whatsapp','linkedin'],'Entreprises guinéennes de 10 à 250 employés', 2500),
('Semaine Microsoft Copilot','semaine-microsoft-copilot','evenement','publiee',
 'Trois sessions de démonstration pour découvrir Copilot dans Microsoft 365.',
 'Rejoignez nos ateliers en ligne et découvrez comment Copilot accélère la rédaction, l''analyse et la collaboration au quotidien.',
 'Nous contacter','/#contact', now() - interval '3 days', now() + interval '30 days',
 ARRAY['site_web','email','facebook'],'Directions informatiques et directions générales', 1200);

INSERT INTO public.marketing_leads (campaign_id, source, company_name, sector, city, employee_count_range, uses_microsoft, microsoft_products, users_to_cover, renewal_timeline, has_current_provider, main_needs, additional_info, full_name, job_title, email, phone, preferred_contact_method, contact_timing, consent_given, consent_text, consent_timestamp, score, priority, score_breakdown, status, created_at)
SELECT c.id, 'formulaire_audit_microsoft', v.company, v.sector, v.city, v.emp, 'Oui', v.products, v.users, v.renewal, v.provider, v.needs, v.info, v.contact, v.job, v.email, v.phone, v.method, v.timing, true,
 (SELECT consent_text FROM public.marketing_settings WHERE id = 1), now() - (v.days || ' days')::interval, v.score, v.priority::public.marketing_lead_priority, v.breakdown::jsonb, v.status::public.marketing_lead_status, now() - (v.days || ' days')::interval
FROM (VALUES
 ('Société Minière de Boké','Mines et sous-traitance minière','Boké','101 à 250',ARRAY['Microsoft 365 E3','Microsoft Azure'],'101 à 250','Dans moins de 30 jours','Oui',ARRAY['Renouveler mes licences','Recevoir un devis','Réduire mes coûts'],'Renouvellement urgent pour 180 postes répartis sur deux sites.','Mamadou Alpha Diallo','Directeur informatique ou DSI','m.diallo@smb-demo.gn','+224 622 11 22 33','Téléphone','Dès que possible',3,115,'urgent','[{"label":"Renouvellement dans moins de 30 jours","points":40},{"label":"Plus de 50 utilisateurs à couvrir","points":20},{"label":"Besoin : Recevoir un devis","points":15},{"label":"Besoin : Renouveler mes licences","points":15},{"label":"Besoin : Réduire mes coûts","points":10},{"label":"Fonction décisionnaire","points":15}]','nouveau'),
 ('Banque Atlantique Guinée','Banque, assurance ou microfinance','Conakry','101 à 250',ARRAY['Microsoft 365 Business Premium','Power BI'],'101 à 250','Dans 1 à 3 mois','Oui',ARRAY['Améliorer la sécurité','Recevoir un devis'],'Besoin de renforcer la sécurité des boîtes aux lettres.','Fatoumata Camara','Directeur administratif et financier','f.camara@bag-demo.gn','+224 628 44 55 66','E-mail','Dans les 24 heures',6,80,'urgent','[{"label":"Renouvellement dans 1 à 3 mois","points":30},{"label":"Plus de 50 utilisateurs à couvrir","points":20},{"label":"Besoin : Recevoir un devis","points":15},{"label":"Fonction décisionnaire","points":15}]','contacte'),
 ('Guinée Telecom Services','Télécommunications','Conakry','51 à 100',ARRAY['Microsoft 365 Business Standard','Teams'],'51 à 100','Dans 4 à 6 mois','Non',ARRAY['Migrer vers Microsoft 365','Renouveler mes licences'],'Migration progressive envisagée avant la fin de l''année.','Ibrahima Sory Bah','Responsable informatique','i.bah@gts-demo.gn','+224 620 77 88 99','WhatsApp','Cette semaine',9,70,'urgent','[{"label":"Renouvellement dans 4 à 6 mois","points":20},{"label":"Plus de 50 utilisateurs à couvrir","points":20},{"label":"Besoin : Renouveler mes licences","points":15},{"label":"Fonction décisionnaire","points":15}]','qualifie'),
 ('Kankan BTP','BTP et immobilier','Kankan','26 à 50',ARRAY['Microsoft 365 Business Basic'],'26 à 50','Dans 4 à 6 mois','Je ne sais pas',ARRAY['Réduire mes coûts','Vérifier les licences inutilisées'],'Plusieurs licences semblent inutilisées depuis un an.','Aissatou Barry','Responsable des achats','a.barry@kankanbtp-demo.gn','+224 621 33 44 55','Téléphone','Dans les 48 heures',12,45,'qualifie','[{"label":"Renouvellement dans 4 à 6 mois","points":20},{"label":"Besoin : Réduire mes coûts","points":10},{"label":"Fonction décisionnaire","points":15}]','nouveau'),
 ('ONG Espoir Guinée','ONG ou organisation internationale','Nzérékoré','11 à 25',ARRAY['Microsoft 365 Business Basic','SharePoint ou OneDrive'],'11 à 25','Dans 7 à 12 mois','Oui',ARRAY['Sauvegarder et protéger mes données','Obtenir des conseils'],'Budget limité, subventions annuelles.','Sekou Conde','Directeur général','s.conde@espoir-demo.org','+224 664 12 34 56','E-mail','Cette semaine',18,15,'a_entretenir','[{"label":"Fonction décisionnaire","points":15}]','sans_suite'),
 ('Distribution Kindia Plus','Commerce et distribution','Kindia','1 à 10',ARRAY['Je ne connais pas les licences utilisées'],'1 à 10','Je ne connais pas la date','Non',ARRAY['Obtenir des conseils','Choisir une formule adaptée'],'Petite structure en cours de digitalisation.','Mariama Sylla','Autre','m.sylla@kindiaplus-demo.gn','+224 625 98 76 54','WhatsApp','Dès que possible',25,0,'a_entretenir','[]','nouveau')
) AS v(company,sector,city,emp,products,users,renewal,provider,needs,info,contact,job,email,phone,method,timing,days,score,priority,breakdown,status)
CROSS JOIN LATERAL (SELECT id FROM public.marketing_campaigns WHERE slug = 'audit-licences-microsoft') c;