/**
 * Référentiel unique des rôles applicatifs.
 * Toute liste de rôles affichée dans l'interface (invitation, détail utilisateur,
 * badges) doit passer par ces constantes pour rester cohérente avec la base.
 */
import type { AppRole } from "@/hooks/use-admin";

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  agent: "Agent",
  comptable: "Comptable",
  gestionnaire: "Gestionnaire",
  hr: "Ressources humaines",
  onboarding: "Onboarding",
  commercial: "Commercial",
  client: "Client",
  client_premium: "Client Premium",
  user: "Utilisateur",
};

/**
 * Rôles proposés dans l'outil d'invitation (individuelle et CSV).
 * `client_premium` et `user` ne sont pas invitables : le premier dépend d'un
 * abonnement payant, le second est un état technique par défaut.
 */
export const INVITABLE_ROLES: AppRole[] = [
  "client",
  "commercial",
  "comptable",
  "gestionnaire",
  "agent",
  "hr",
  "admin",
];
