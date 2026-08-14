import type { Database } from "@/integrations/supabase/types";

export type Lead = Database["public"]["Tables"]["marketing_leads"]["Row"];
export type Campaign = Database["public"]["Tables"]["marketing_campaigns"]["Row"];
export type LeadActivity = Database["public"]["Tables"]["lead_activities"]["Row"];
export type MarketingSettings = Database["public"]["Tables"]["marketing_settings"]["Row"];
export type LeadStatus = Database["public"]["Enums"]["marketing_lead_status"];
export type LeadPriority = Database["public"]["Enums"]["marketing_lead_priority"];
export type CampaignStatus = Database["public"]["Enums"]["marketing_campaign_status"];
export type CampaignType = Database["public"]["Enums"]["marketing_campaign_type"];
export type ActivityType = Database["public"]["Enums"]["lead_activity_type"];

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "nouveau", label: "Nouveau" },
  { value: "contacte", label: "Contacté" },
  { value: "qualifie", label: "Qualifié" },
  { value: "devis_envoye", label: "Devis envoyé" },
  { value: "gagne", label: "Gagné" },
  { value: "perdu", label: "Perdu" },
  { value: "sans_suite", label: "Sans suite" },
];

export const LEAD_PRIORITIES: { value: LeadPriority; label: string; className: string }[] = [
  { value: "urgent", label: "Urgent", className: "bg-destructive/10 text-destructive border-destructive/30" },
  { value: "qualifie", label: "Qualifié", className: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400" },
  { value: "a_entretenir", label: "À entretenir", className: "bg-muted text-muted-foreground border-border" },
];

export const CAMPAIGN_STATUSES: { value: CampaignStatus; label: string; className: string }[] = [
  { value: "brouillon", label: "Brouillon", className: "bg-muted text-muted-foreground" },
  { value: "planifiee", label: "Planifiée", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  { value: "publiee", label: "Publiée", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  { value: "terminee", label: "Terminée", className: "bg-primary/10 text-primary" },
  { value: "archivee", label: "Archivée", className: "bg-muted text-muted-foreground line-through" },
];

export const CAMPAIGN_TYPES: { value: CampaignType; label: string }[] = [
  { value: "annonce", label: "Annonce" },
  { value: "promotion", label: "Promotion" },
  { value: "evenement", label: "Événement" },
  { value: "formulaire_qualification", label: "Formulaire de qualification" },
];

export const CAMPAIGN_CHANNELS = ["Site web", "E-mail", "WhatsApp", "LinkedIn", "Facebook"];

export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "appel", label: "Appel" },
  { value: "email", label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "rendez_vous", label: "Rendez-vous" },
  { value: "changement_statut", label: "Changement de statut" },
];

export const NEAR_RENEWAL = ["Dans moins de 30 jours", "Dans 1 à 3 mois", "Dans 4 à 6 mois"];

export const statusLabel = (s: string) => LEAD_STATUSES.find((x) => x.value === s)?.label ?? s;
export const priorityMeta = (p: string) => LEAD_PRIORITIES.find((x) => x.value === p) ?? LEAD_PRIORITIES[2];

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function whatsappLink(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}
