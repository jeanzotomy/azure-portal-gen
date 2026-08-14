import {
  GUINEA_CITIES, JOB_TITLES, SECTORS,
  type FieldType,
} from "@/lib/marketing-forms";

export interface TemplateField {
  section: string;
  field_key: string;
  label: string;
  help_text?: string;
  type: FieldType;
  options?: string[];
  required: boolean;
  max_selections?: number;
  maps_to?: string;
  visible_when?: { field_key: string; operator: "est" | "nest_pas" | "contient" | "est_rempli"; values: string[] };
}

export interface TemplateRule {
  field_key: string;
  operator: "est" | "contient" | "superieur_a" | "est_rempli";
  value: string[];
  points: number;
  label: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  form: {
    title: string;
    intro_text: string;
    start_button_label: string;
    submit_label: string;
    confirmation_title: string;
    confirmation_text: string;
    banner_variant: "aucune" | "audit_microsoft" | "image";
    score_urgent_threshold: number;
    score_qualified_threshold: number;
    consent_text: string;
  };
  fields: TemplateField[];
  rules: TemplateRule[];
}

const DEFAULT_CONSENT =
  "J'accepte que Cloud Mature collecte et utilise les informations communiquées dans ce formulaire afin de traiter ma demande et de me contacter à ce sujet. Je comprends que je peux retirer mon consentement à tout moment en écrivant à info@cloudmature.com.";

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "audit-microsoft",
    name: "Audit de licences Microsoft",
    description: "17 questions, logique conditionnelle et barème de qualification complet.",
    form: {
      title: "Audit gratuit de vos licences Microsoft",
      intro_text:
        "Anticipez votre renouvellement et évitez les interruptions ou les dépenses inutiles. Répondez à quelques questions pour demander un audit gratuit de vos licences Microsoft. Durée : environ 2 minutes.",
      start_button_label: "Commencer mon audit",
      submit_label: "Demander mon audit gratuit",
      confirmation_title: "Votre demande a bien été enregistrée !",
      confirmation_text:
        "Merci pour votre confiance. Un conseiller Cloud Mature vous contactera prochainement afin d'examiner vos licences, votre prochaine échéance et les possibilités d'optimisation.",
      banner_variant: "audit_microsoft",
      score_urgent_threshold: 60,
      score_qualified_threshold: 35,
      consent_text: DEFAULT_CONSENT,
    },
    fields: [
      { section: "Entreprise", field_key: "company_name", label: "Nom de l'entreprise", type: "texte_court", required: true, maps_to: "company_name" },
      { section: "Entreprise", field_key: "sector", label: "Secteur d'activité", type: "choix_unique", options: SECTORS, required: true, maps_to: "sector" },
      { section: "Entreprise", field_key: "city", label: "Ville principale", type: "liste_deroulante", options: GUINEA_CITIES, required: true, maps_to: "city" },
      { section: "Entreprise", field_key: "employee_count_range", label: "Nombre approximatif d'employés", type: "choix_unique", options: ["1 à 10", "11 à 25", "26 à 50", "51 à 100", "101 à 250", "Plus de 250"], required: true, maps_to: "employee_count_range" },
      { section: "Licences Microsoft", field_key: "uses_microsoft", label: "Utilisez-vous actuellement des produits ou licences Microsoft ?", type: "choix_unique", options: ["Oui", "Non", "Je ne sais pas"], required: true, maps_to: "uses_microsoft" },
      {
        section: "Licences Microsoft", field_key: "microsoft_products",
        label: "Quelles solutions Microsoft utilisez-vous actuellement ?",
        help_text: "Plusieurs réponses possibles.", type: "choix_multiple", required: true,
        maps_to: "microsoft_products",
        visible_when: { field_key: "uses_microsoft", operator: "est", values: ["Oui"] },
        options: ["Microsoft 365 Business Basic", "Microsoft 365 Business Standard", "Microsoft 365 Business Premium", "Microsoft 365 E1", "Microsoft 365 E3", "Microsoft 365 E5", "Microsoft Azure", "Windows Server", "Power BI", "Dynamics 365", "Microsoft Copilot", "Exchange Online", "Teams", "SharePoint ou OneDrive", "Autre", "Je ne connais pas les licences utilisées"],
      },
      { section: "Licences Microsoft", field_key: "users_to_cover", label: "Combien d'utilisateurs doivent être couverts par les licences ?", type: "choix_unique", options: ["1 à 10", "11 à 25", "26 à 50", "51 à 100", "101 à 250", "Plus de 250", "Je ne sais pas encore"], required: true, maps_to: "users_to_cover" },
      { section: "Licences Microsoft", field_key: "renewal_timeline", label: "Quand vos licences doivent-elles être renouvelées ?", type: "choix_unique", options: ["Dans moins de 30 jours", "Dans 1 à 3 mois", "Dans 4 à 6 mois", "Dans 7 à 12 mois", "Dans plus de 12 mois", "Je ne connais pas la date", "Je n'ai pas encore de licences"], required: true, maps_to: "renewal_timeline" },
      { section: "Licences Microsoft", field_key: "has_current_provider", label: "Avez-vous actuellement un fournisseur de licences Microsoft ?", type: "choix_unique", options: ["Oui", "Non", "Je ne sais pas", "Je préfère ne pas répondre"], required: true, maps_to: "has_current_provider" },
      { section: "Licences Microsoft", field_key: "main_needs", label: "Quel est votre principal besoin ?", help_text: "3 réponses maximum.", type: "choix_multiple", max_selections: 3, required: true, maps_to: "main_needs", options: ["Renouveler mes licences", "Acheter de nouvelles licences", "Réduire mes coûts", "Vérifier les licences inutilisées", "Choisir une formule adaptée", "Migrer vers Microsoft 365", "Améliorer la sécurité", "Sauvegarder et protéger mes données", "Déployer Microsoft Copilot", "Migrer vers Azure", "Obtenir du support technique", "Recevoir un devis", "Obtenir des conseils"] },
      { section: "Licences Microsoft", field_key: "additional_info", label: "Informations complémentaires", help_text: "Décrivez brièvement votre environnement, vos difficultés ou votre projet.", type: "texte_long", required: false, maps_to: "additional_info" },
      { section: "Personne à contacter", field_key: "full_name", label: "Prénom et nom", type: "texte_court", required: true, maps_to: "full_name" },
      { section: "Personne à contacter", field_key: "job_title", label: "Fonction", type: "choix_unique", options: JOB_TITLES, required: true, maps_to: "job_title" },
      { section: "Personne à contacter", field_key: "email", label: "Adresse e-mail professionnelle", type: "email", required: true, maps_to: "email" },
      { section: "Personne à contacter", field_key: "phone", label: "Numéro de téléphone ou WhatsApp", type: "telephone", required: true, maps_to: "phone" },
      { section: "Personne à contacter", field_key: "preferred_contact_method", label: "Moyen de contact préféré", type: "choix_unique", options: ["Téléphone", "WhatsApp", "E-mail", "Visioconférence Microsoft Teams"], required: true, maps_to: "preferred_contact_method" },
      { section: "Personne à contacter", field_key: "contact_timing", label: "Quand souhaitez-vous être contacté ?", type: "choix_unique", options: ["Dès que possible", "Dans les 24 heures", "Dans les 48 heures", "Cette semaine", "À une date précise"], required: true, maps_to: "contact_timing" },
      { section: "Personne à contacter", field_key: "preferred_datetime", label: "Choisissez une date et une heure", type: "date_heure", required: true, maps_to: "preferred_datetime", visible_when: { field_key: "contact_timing", operator: "est", values: ["À une date précise"] } },
    ],
    rules: [
      { field_key: "renewal_timeline", operator: "est", value: ["Dans moins de 30 jours"], points: 40, label: "Renouvellement dans moins de 30 jours" },
      { field_key: "renewal_timeline", operator: "est", value: ["Dans 1 à 3 mois"], points: 30, label: "Renouvellement dans 1 à 3 mois" },
      { field_key: "renewal_timeline", operator: "est", value: ["Dans 4 à 6 mois"], points: 20, label: "Renouvellement dans 4 à 6 mois" },
      { field_key: "users_to_cover", operator: "est", value: ["51 à 100", "101 à 250", "Plus de 250"], points: 20, label: "Plus de 50 utilisateurs à couvrir" },
      { field_key: "main_needs", operator: "contient", value: ["Recevoir un devis"], points: 15, label: "Besoin : Recevoir un devis" },
      { field_key: "main_needs", operator: "contient", value: ["Renouveler mes licences"], points: 15, label: "Besoin : Renouveler mes licences" },
      { field_key: "main_needs", operator: "contient", value: ["Réduire mes coûts"], points: 10, label: "Besoin : Réduire mes coûts" },
      { field_key: "job_title", operator: "est", value: ["Directeur informatique ou DSI", "Responsable informatique", "Directeur général", "Directeur administratif et financier", "Responsable des achats"], points: 15, label: "Fonction décisionnaire" },
    ],
  },
  {
    id: "devis",
    name: "Demande de devis",
    description: "Formulaire court pour qualifier une demande commerciale et produire une proposition.",
    form: {
      title: "Demande de devis",
      intro_text: "Quelques questions suffisent pour préparer votre proposition. Durée : moins d'une minute.",
      start_button_label: "Demander mon devis",
      submit_label: "Recevoir ma proposition",
      confirmation_title: "Votre demande de devis est enregistrée",
      confirmation_text: "Notre équipe commerciale prépare votre proposition et revient vers vous sous 48 heures ouvrées.",
      banner_variant: "aucune",
      score_urgent_threshold: 40,
      score_qualified_threshold: 20,
      consent_text: DEFAULT_CONSENT,
    },
    fields: [
      { section: "Entreprise", field_key: "company_name", label: "Nom de l'entreprise", type: "texte_court", required: true, maps_to: "company_name" },
      { section: "Entreprise", field_key: "sector", label: "Secteur d'activité", type: "choix_unique", options: SECTORS, required: true, maps_to: "sector" },
      { section: "Projet", field_key: "main_needs", label: "Quels services vous intéressent ?", help_text: "3 réponses maximum.", type: "choix_multiple", max_selections: 3, required: true, maps_to: "main_needs", options: ["Licences Microsoft 365", "Migration vers Azure", "Sécurité et sauvegarde", "Support informatique", "Formation des équipes", "Conseil et audit"] },
      { section: "Projet", field_key: "budget_range", label: "Budget estimé", type: "choix_unique", options: ["Moins de 10 000 000 GNF", "10 à 50 millions GNF", "50 à 150 millions GNF", "Plus de 150 millions GNF", "Je ne sais pas encore"], required: false },
      { section: "Projet", field_key: "renewal_timeline", label: "Quelle est l'échéance de votre projet ?", type: "choix_unique", options: ["Dans moins de 30 jours", "Dans 1 à 3 mois", "Dans 4 à 6 mois", "Dans plus de 6 mois"], required: true, maps_to: "renewal_timeline" },
      { section: "Projet", field_key: "additional_info", label: "Précisions utiles", type: "texte_long", required: false, maps_to: "additional_info" },
      { section: "Contact", field_key: "full_name", label: "Prénom et nom", type: "texte_court", required: true, maps_to: "full_name" },
      { section: "Contact", field_key: "job_title", label: "Fonction", type: "choix_unique", options: JOB_TITLES, required: true, maps_to: "job_title" },
      { section: "Contact", field_key: "email", label: "Adresse e-mail professionnelle", type: "email", required: true, maps_to: "email" },
      { section: "Contact", field_key: "phone", label: "Téléphone ou WhatsApp", type: "telephone", required: true, maps_to: "phone" },
    ],
    rules: [
      { field_key: "renewal_timeline", operator: "est", value: ["Dans moins de 30 jours"], points: 30, label: "Projet à moins de 30 jours" },
      { field_key: "renewal_timeline", operator: "est", value: ["Dans 1 à 3 mois"], points: 20, label: "Projet dans 1 à 3 mois" },
      { field_key: "budget_range", operator: "est", value: ["50 à 150 millions GNF", "Plus de 150 millions GNF"], points: 20, label: "Budget supérieur à 50 millions GNF" },
      { field_key: "job_title", operator: "est", value: ["Directeur général", "Directeur informatique ou DSI", "Directeur administratif et financier", "Responsable des achats"], points: 15, label: "Fonction décisionnaire" },
    ],
  },
  {
    id: "evenement",
    name: "Inscription à un événement",
    description: "Collecte des participants : coordonnées, session choisie et besoins particuliers.",
    form: {
      title: "Inscription à notre événement",
      intro_text: "Réservez votre place en moins d'une minute. Une confirmation vous sera envoyée par e-mail.",
      start_button_label: "M'inscrire",
      submit_label: "Confirmer mon inscription",
      confirmation_title: "Votre inscription est confirmée",
      confirmation_text: "Merci ! Vous recevez un e-mail de confirmation avec les informations pratiques.",
      banner_variant: "aucune",
      score_urgent_threshold: 30,
      score_qualified_threshold: 15,
      consent_text: DEFAULT_CONSENT,
    },
    fields: [
      { section: "Participant", field_key: "full_name", label: "Prénom et nom", type: "texte_court", required: true, maps_to: "full_name" },
      { section: "Participant", field_key: "email", label: "Adresse e-mail", type: "email", required: true, maps_to: "email" },
      { section: "Participant", field_key: "phone", label: "Téléphone ou WhatsApp", type: "telephone", required: true, maps_to: "phone" },
      { section: "Participant", field_key: "company_name", label: "Entreprise ou organisation", type: "texte_court", required: true, maps_to: "company_name" },
      { section: "Participant", field_key: "job_title", label: "Fonction", type: "choix_unique", options: JOB_TITLES, required: true, maps_to: "job_title" },
      { section: "Participation", field_key: "city", label: "Ville de participation", type: "liste_deroulante", options: GUINEA_CITIES, required: true, maps_to: "city" },
      { section: "Participation", field_key: "attendance_mode", label: "Comment souhaitez-vous participer ?", type: "choix_unique", options: ["Sur place", "En ligne"], required: true },
      { section: "Participation", field_key: "session_choice", label: "Quelle session choisissez-vous ?", type: "choix_unique", options: ["Matin", "Après-midi", "Journée complète"], required: true },
      { section: "Participation", field_key: "guests_count", label: "Nombre d'accompagnants", type: "nombre", required: false },
      { section: "Participation", field_key: "additional_info", label: "Besoins particuliers", help_text: "Accessibilité, restauration, questions à aborder…", type: "texte_long", required: false, maps_to: "additional_info" },
    ],
    rules: [
      { field_key: "attendance_mode", operator: "est", value: ["Sur place"], points: 15, label: "Participation sur place" },
      { field_key: "session_choice", operator: "est", value: ["Journée complète"], points: 15, label: "Journée complète" },
      { field_key: "job_title", operator: "est", value: ["Directeur général", "Directeur informatique ou DSI"], points: 15, label: "Fonction décisionnaire" },
    ],
  },
];
