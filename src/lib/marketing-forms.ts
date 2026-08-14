/**
 * Moteur de formulaires marketing — types partagés, visibilité conditionnelle,
 * validation et calcul de score (utilisé par le rendu public ET le simulateur
 * de l'éditeur). Le score qui fait foi reste calculé côté serveur.
 */
import type { Database } from "@/integrations/supabase/types";

export type MarketingForm = Database["public"]["Tables"]["marketing_forms"]["Row"];
export type MarketingFormField = Database["public"]["Tables"]["marketing_form_fields"]["Row"];
export type MarketingFormScoringRule = Database["public"]["Tables"]["marketing_form_scoring_rules"]["Row"];
export type MarketingFormSubmission = Database["public"]["Tables"]["marketing_form_submissions"]["Row"];

export type FieldType =
  | "texte_court" | "texte_long" | "email" | "telephone" | "nombre" | "date" | "date_heure"
  | "choix_unique" | "choix_multiple" | "liste_deroulante" | "oui_non" | "echelle"
  | "fichier" | "titre_section";

export type FormStatus = "brouillon" | "publiee" | "fermee";
export type BannerVariant = "aucune" | "audit_microsoft" | "image";
export type FormLayout = "une_question_par_ecran" | "page_unique";

export type AnswerValue = string | string[];
export type Answers = Record<string, AnswerValue>;

export type VisibilityOperator = "est" | "nest_pas" | "contient" | "est_rempli";
export interface VisibleWhen {
  field_key: string;
  operator: VisibilityOperator;
  values: string[];
}

export type ScoringOperator = "est" | "contient" | "superieur_a" | "est_rempli";
export interface ScoreLine { label: string; points: number }

/* ------------------------------------------------------------------ */
/* Métadonnées des types de champ                                      */
/* ------------------------------------------------------------------ */

export interface FieldTypeMeta {
  value: FieldType;
  label: string;
  icon: string;
  example: string;
  hasOptions: boolean;
  answerable: boolean;
}

export const FIELD_TYPES: FieldTypeMeta[] = [
  { value: "texte_court", label: "Texte court", icon: "Type", example: "Nom de l'entreprise", hasOptions: false, answerable: true },
  { value: "texte_long", label: "Texte long", icon: "AlignLeft", example: "Décrivez votre projet", hasOptions: false, answerable: true },
  { value: "email", label: "Adresse e-mail", icon: "Mail", example: "prenom.nom@entreprise.com", hasOptions: false, answerable: true },
  { value: "telephone", label: "Téléphone", icon: "Phone", example: "+224 6XX XX XX XX", hasOptions: false, answerable: true },
  { value: "nombre", label: "Nombre", icon: "Hash", example: "Nombre de postes", hasOptions: false, answerable: true },
  { value: "date", label: "Date", icon: "Calendar", example: "Date de démarrage souhaitée", hasOptions: false, answerable: true },
  { value: "date_heure", label: "Date et heure", icon: "CalendarClock", example: "Créneau de rappel", hasOptions: false, answerable: true },
  { value: "choix_unique", label: "Choix unique", icon: "CircleDot", example: "Oui / Non / Je ne sais pas", hasOptions: true, answerable: true },
  { value: "choix_multiple", label: "Choix multiple", icon: "ListChecks", example: "Plusieurs besoins possibles", hasOptions: true, answerable: true },
  { value: "liste_deroulante", label: "Liste déroulante", icon: "ChevronDownSquare", example: "Ville de Guinée", hasOptions: true, answerable: true },
  { value: "oui_non", label: "Oui / Non", icon: "ToggleLeft", example: "Avez-vous déjà un fournisseur ?", hasOptions: false, answerable: true },
  { value: "echelle", label: "Échelle de notation", icon: "Gauge", example: "Satisfaction de 1 à 5", hasOptions: false, answerable: true },
  { value: "fichier", label: "Fichier", icon: "Paperclip", example: "Cahier des charges", hasOptions: false, answerable: true },
  { value: "titre_section", label: "Titre de section", icon: "Heading", example: "Vos coordonnées (affichage seul)", hasOptions: false, answerable: false },
];

export const fieldTypeMeta = (t: string): FieldTypeMeta =>
  FIELD_TYPES.find((f) => f.value === t) ?? FIELD_TYPES[0];

export const isMultiValue = (t: string) => t === "choix_multiple";
export const hasOptions = (t: string) => fieldTypeMeta(t).hasOptions;
export const isAnswerable = (t: string) => fieldTypeMeta(t).answerable;

/* ------------------------------------------------------------------ */
/* Colonnes de `marketing_leads` alimentables via `maps_to`            */
/* ------------------------------------------------------------------ */

export const LEAD_MAPPABLE_COLUMNS: { value: string; label: string; multi?: boolean }[] = [
  { value: "company_name", label: "Nom de l'entreprise" },
  { value: "full_name", label: "Prénom et nom" },
  { value: "email", label: "Adresse e-mail" },
  { value: "phone", label: "Téléphone" },
  { value: "job_title", label: "Fonction" },
  { value: "city", label: "Ville" },
  { value: "sector", label: "Secteur d'activité" },
  { value: "employee_count_range", label: "Nombre d'employés" },
  { value: "users_to_cover", label: "Utilisateurs à couvrir" },
  { value: "renewal_timeline", label: "Échéance de renouvellement" },
  { value: "uses_microsoft", label: "Utilise Microsoft" },
  { value: "has_current_provider", label: "Fournisseur actuel" },
  { value: "microsoft_products", label: "Solutions Microsoft", multi: true },
  { value: "main_needs", label: "Besoins principaux", multi: true },
  { value: "additional_info", label: "Informations complémentaires" },
  { value: "preferred_contact_method", label: "Moyen de contact préféré" },
  { value: "contact_timing", label: "Disponibilité" },
  { value: "preferred_datetime", label: "Date et heure souhaitées" },
];

/* ------------------------------------------------------------------ */
/* Bibliothèque de champs prêts à l'emploi                             */
/* ------------------------------------------------------------------ */

export const GUINEA_CITIES = [
  "Conakry", "Boké", "Kamsar", "Kindia", "Mamou", "Labé", "Kankan", "Nzérékoré", "Autre",
];

export const SECTORS = [
  "Mines et sous-traitance minière", "Banque, assurance ou microfinance", "Télécommunications",
  "Informatique et services numériques", "BTP et immobilier", "Transport et logistique",
  "Commerce et distribution", "Industrie", "ONG ou organisation internationale",
  "Administration publique", "Santé", "Éducation", "Cabinet ou services professionnels", "Autre",
];

export const JOB_TITLES = [
  "Directeur général", "Directeur informatique ou DSI", "Responsable informatique",
  "Directeur administratif et financier", "Responsable administratif", "Responsable des achats",
  "Responsable des ressources humaines", "Consultant ou prestataire", "Autre",
];

export interface FieldPreset {
  id: string;
  name: string;
  section: string;
  field_key: string;
  label: string;
  help_text?: string;
  placeholder?: string;
  type: FieldType;
  options?: string[];
  required: boolean;
  max_selections?: number;
  maps_to?: string;
}

export const FIELD_PRESETS: FieldPreset[] = [
  { id: "company", name: "Nom de l'entreprise", section: "Entreprise", field_key: "company_name", label: "Nom de l'entreprise", type: "texte_court", required: true, maps_to: "company_name" },
  { id: "sector", name: "Secteur d'activité", section: "Entreprise", field_key: "sector", label: "Secteur d'activité", type: "choix_unique", options: SECTORS, required: true, maps_to: "sector" },
  { id: "city", name: "Ville de Guinée", section: "Entreprise", field_key: "city", label: "Ville principale", type: "liste_deroulante", options: GUINEA_CITIES, required: true, maps_to: "city" },
  { id: "employees", name: "Nombre d'employés", section: "Entreprise", field_key: "employee_count_range", label: "Nombre approximatif d'employés", type: "choix_unique", options: ["1 à 10", "11 à 25", "26 à 50", "51 à 100", "101 à 250", "Plus de 250"], required: true, maps_to: "employee_count_range" },
  { id: "fullname", name: "Prénom et nom", section: "Contact", field_key: "full_name", label: "Prénom et nom", type: "texte_court", required: true, maps_to: "full_name" },
  { id: "jobtitle", name: "Fonction", section: "Contact", field_key: "job_title", label: "Fonction", type: "choix_unique", options: JOB_TITLES, required: true, maps_to: "job_title" },
  { id: "email", name: "E-mail professionnel", section: "Contact", field_key: "email", label: "Adresse e-mail professionnelle", placeholder: "prenom.nom@entreprise.com", type: "email", required: true, maps_to: "email" },
  { id: "phone", name: "Téléphone / WhatsApp", section: "Contact", field_key: "phone", label: "Numéro de téléphone ou WhatsApp", placeholder: "+224 6XX XX XX XX", type: "telephone", required: true, maps_to: "phone" },
  { id: "contactmethod", name: "Moyen de contact préféré", section: "Contact", field_key: "preferred_contact_method", label: "Moyen de contact préféré", type: "choix_unique", options: ["Téléphone", "WhatsApp", "E-mail", "Visioconférence Microsoft Teams"], required: true, maps_to: "preferred_contact_method" },
  { id: "budget", name: "Budget estimé", section: "Projet", field_key: "budget_range", label: "Budget estimé", type: "choix_unique", options: ["Moins de 10 000 000 GNF", "10 à 50 millions GNF", "50 à 150 millions GNF", "Plus de 150 millions GNF", "Je ne sais pas encore"], required: false },
  { id: "deadline", name: "Échéance du projet", section: "Projet", field_key: "renewal_timeline", label: "Quelle est l'échéance de votre projet ?", type: "choix_unique", options: ["Dans moins de 30 jours", "Dans 1 à 3 mois", "Dans 4 à 6 mois", "Dans 7 à 12 mois", "Dans plus de 12 mois", "Je ne connais pas la date"], required: true, maps_to: "renewal_timeline" },
];

/* ------------------------------------------------------------------ */
/* Utilitaires                                                          */
/* ------------------------------------------------------------------ */

export const slugifyKey = (label: string): string =>
  label
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50) || "champ";

export const slugifyPath = (label: string): string =>
  label
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "formulaire";

export const asArray = (v: AnswerValue | undefined): string[] =>
  Array.isArray(v) ? v : typeof v === "string" && v ? [v] : [];

export const asText = (v: AnswerValue | undefined): string =>
  Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "";

/** `datetime-local` / `date` lisent `min` en heure locale : formater localement. */
export const toLocalInputValue = (d: Date, withTime = true): string => {
  const p = (n: number) => String(n).padStart(2, "0");
  const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return withTime ? `${day}T${p(d.getHours())}:${p(d.getMinutes())}` : day;
};

export const parseVisibleWhen = (raw: unknown): VisibleWhen | null => {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Partial<VisibleWhen>;
  if (!v.field_key || !v.operator) return null;
  return { field_key: v.field_key, operator: v.operator, values: Array.isArray(v.values) ? v.values : [] };
};

export const parseOptions = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((o): o is string => typeof o === "string") : [];

/* ------------------------------------------------------------------ */
/* Visibilité conditionnelle                                            */
/* ------------------------------------------------------------------ */

export function isFieldVisible(field: Pick<MarketingFormField, "visible_when">, answers: Answers): boolean {
  const rule = parseVisibleWhen(field.visible_when);
  if (!rule) return true;
  const raw = answers[rule.field_key];
  const values = rule.values ?? [];
  switch (rule.operator) {
    case "est":
      return Array.isArray(raw) ? raw.some((v) => values.includes(v)) : values.includes(asText(raw));
    case "nest_pas":
      return Array.isArray(raw) ? !raw.some((v) => values.includes(v)) : !values.includes(asText(raw));
    case "contient":
      return asArray(raw).some((v) => values.includes(v));
    case "est_rempli":
      return Array.isArray(raw) ? raw.length > 0 : !!asText(raw).trim();
    default:
      return true;
  }
}

export function getVisibleFields<T extends Pick<MarketingFormField, "visible_when">>(
  fields: T[], answers: Answers,
): T[] {
  return fields.filter((f) => isFieldVisible(f, answers));
}

/* ------------------------------------------------------------------ */
/* Validation (miroir client de la validation serveur)                  */
/* ------------------------------------------------------------------ */

export function validateFieldValue(field: MarketingFormField, value: AnswerValue | undefined): string | null {
  if (!isAnswerable(field.type)) return null;

  if (isMultiValue(field.type)) {
    const list = Array.isArray(value) ? value : [];
    if (field.required && list.length === 0) return "Veuillez sélectionner au moins une réponse.";
    if (field.max_selections && list.length > field.max_selections)
      return `${field.max_selections} réponses maximum.`;
    return null;
  }

  const text = asText(value).trim();
  if (field.required && !text) return "Cette réponse est obligatoire.";
  if (!text) return null;

  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text))
    return "Veuillez saisir une adresse e-mail valide.";
  if (field.type === "telephone" && text.replace(/\D/g, "").length < 8)
    return "Veuillez saisir un numéro de téléphone valide.";
  if (field.type === "nombre") {
    const n = Number(text);
    if (Number.isNaN(n)) return "Veuillez saisir un nombre.";
    if (field.min_value !== null && n < Number(field.min_value)) return `La valeur minimale est ${field.min_value}.`;
    if (field.max_value !== null && n > Number(field.max_value)) return `La valeur maximale est ${field.max_value}.`;
  }
  if (field.type === "date_heure" && new Date(text).getTime() < Date.now())
    return "Veuillez choisir une date à venir.";
  if (field.regex_validation) {
    try {
      if (!new RegExp(field.regex_validation).test(text)) return "Le format de la réponse est invalide.";
    } catch { /* expression invalide : ignorée */ }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Scoring                                                              */
/* ------------------------------------------------------------------ */

export function ruleMatches(
  operator: string, ruleValues: string[], answer: AnswerValue | undefined,
): boolean {
  switch (operator) {
    case "est":
      return Array.isArray(answer)
        ? answer.some((v) => ruleValues.includes(v))
        : ruleValues.includes(asText(answer));
    case "contient":
      return asArray(answer).some((v) => ruleValues.includes(v));
    case "superieur_a": {
      const threshold = Number(ruleValues[0]);
      const n = Number(asText(answer));
      return !Number.isNaN(threshold) && !Number.isNaN(n) && n > threshold;
    }
    case "est_rempli":
      return Array.isArray(answer) ? answer.length > 0 : !!asText(answer).trim();
    default:
      return false;
  }
}

export function computeScore(
  rules: Pick<MarketingFormScoringRule, "field_key" | "operator" | "value" | "points" | "label">[],
  answers: Answers,
): { score: number; breakdown: ScoreLine[] } {
  const breakdown: ScoreLine[] = [];
  for (const rule of rules) {
    const values = Array.isArray(rule.value)
      ? rule.value.map((v) => String(v))
      : rule.value === null || rule.value === undefined ? [] : [String(rule.value)];
    if (ruleMatches(rule.operator, values, answers[rule.field_key])) {
      breakdown.push({ label: rule.label, points: rule.points });
    }
  }
  return { score: breakdown.reduce((s, b) => s + b.points, 0), breakdown };
}

export type Priority = "urgent" | "qualifie" | "a_entretenir";

export const priorityFor = (score: number, urgent: number, qualified: number): Priority =>
  score >= urgent ? "urgent" : score >= qualified ? "qualifie" : "a_entretenir";

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: "Urgent",
  qualifie: "Qualifié",
  a_entretenir: "À entretenir",
};

export const FORM_STATUS_META: { value: FormStatus; label: string; className: string }[] = [
  { value: "brouillon", label: "Brouillon", className: "bg-muted text-muted-foreground" },
  { value: "publiee", label: "Publiée", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  { value: "fermee", label: "Fermée", className: "bg-destructive/10 text-destructive" },
];
