import { useEffect, useRef, useState } from "react";

/**
 * Brouillons de formulaires : sauvegarde continue en localStorage pour que
 * toute saisie en cours survive à une fermeture de fenêtre, un rechargement
 * forcé (mise à jour) ou une déconnexion automatique.
 *
 * Deux garde-fous :
 * - un brouillon « vide » n'est jamais enregistré ni proposé à la reprise ;
 * - l'état initial (données chargées ou modèle vierge) n'écrase jamais un
 *   brouillon existant : seule une modification réelle de l'utilisateur écrit.
 */

const PREFIX = "cm_form_draft:";

export interface Draft<T> {
  value: T;
  savedAt: number;
}

export function saveDraft<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ value, savedAt: Date.now() } satisfies Draft<T>));
  } catch {
    /* stockage indisponible ou plein : ignorer */
  }
}

export function readDraft<T>(key: string): Draft<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft<T>;
    if (parsed == null || typeof parsed !== "object" || !("value" in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignorer */
  }
}

export interface FormDraftControls<T> {
  /** Brouillon retrouvé à l'ouverture du formulaire, s'il est non vide et différent de l'état initial. */
  pendingDraft: Draft<T> | null;
  /** Applique le brouillon : retourne sa valeur et efface la proposition. */
  restore: () => T | null;
  /** Refuse le brouillon : le supprime définitivement. */
  discard: () => void;
  /** Supprime le brouillon sans proposer de reprise (après enregistrement réussi). */
  clear: () => void;
}

/**
 * Sauvegarde `value` en continu (debounce 500 ms) sous `key`, dès qu'elle
 * s'écarte de l'état initial, et propose la reprise d'un brouillon antérieur.
 */
export function useFormDraft<T>(
  key: string,
  value: T,
  isEmpty: (v: T) => boolean,
  enabled = true,
): FormDraftControls<T> {
  const [pendingDraft, setPendingDraft] = useState<Draft<T> | null>(null);
  // Photographie de l'état initial à l'ouverture : tant que la valeur lui est
  // identique, rien n'est écrit (on ne transforme jamais du contenu chargé en brouillon).
  const pristineRef = useRef<string | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!enabled) {
      setPendingDraft(null);
      pristineRef.current = null;
      return;
    }
    pristineRef.current = JSON.stringify(valueRef.current);
    const d = readDraft<T>(key);
    setPendingDraft(
      d && !isEmpty(d.value) && JSON.stringify(d.value) !== pristineRef.current ? d : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      if (isEmpty(value)) return; // ne jamais écraser un brouillon par un état vide
      if (JSON.stringify(value) === pristineRef.current) return; // pas encore modifié
      saveDraft(key, value);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value, enabled]);

  return {
    pendingDraft,
    restore: () => {
      const d = pendingDraft;
      setPendingDraft(null);
      return d ? d.value : null;
    },
    discard: () => {
      clearDraft(key);
      setPendingDraft(null);
    },
    clear: () => {
      clearDraft(key);
      setPendingDraft(null);
    },
  };
}
