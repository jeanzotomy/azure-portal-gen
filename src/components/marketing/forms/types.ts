import type { MarketingFormField, MarketingFormScoringRule } from "@/lib/marketing-forms";

/** Champ en cours d'édition : identique à la ligne en base, mais l'identifiant
 *  peut être généré côté navigateur tant que le formulaire n'a pas été enregistré. */
export type DraftField = Omit<MarketingFormField, "created_at" | "updated_at">;

export type DraftRule = Omit<MarketingFormScoringRule, "created_at" | "updated_at">;

export const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
