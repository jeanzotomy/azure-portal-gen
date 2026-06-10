# Paramètres > Intégrations

## 1. Activer Stripe Payments natif (Lovable)

- Vendeur en Guinée → la prise en charge complète des taxes (`managed_payments`) n'est pas disponible pour ce pays.
- Je vais activer Stripe avec **calcul et collecte automatiques des taxes uniquement** (`automatic_tax`, +0,5 %). Tu gardes la responsabilité de déclaration/remise.
- Tu remplis un petit formulaire (email, nom commercial) au moment de l'activation. Environnement test immédiat ; le passage en live nécessite ensuite la vérification du compte.

Aucun catalogue produit ni page de checkout n'est créé dans ce plan — seulement l'activation et l'affichage du statut dans la section Intégrations. Quand tu seras prêt à vendre, on créera produits + checkout dans une étape suivante.

## 2. Backend — 2 nouvelles tables

### `api_tokens` (clés API sortantes — pour qu'un tiers appelle nos Edge Functions)
- `id uuid pk`, `name text`, `token_prefix text` (8 premiers caractères, affichable), `token_hash text` (SHA-256, jamais la valeur en clair), `scopes text[]`, `created_by uuid`, `created_at`, `last_used_at`, `expires_at nullable`, `revoked_at nullable`.
- Le token complet n'est affiché **qu'une seule fois** à la création.
- RLS : admin uniquement (SELECT/INSERT/UPDATE), `service_role` plein accès.

### `webhook_events` (journal d'appels webhooks entrants)
- `id uuid`, `source text` (stripe/mailgun/sharepoint/…), `event_type text`, `status text` (received/processed/failed), `error text nullable`, `payload jsonb`, `received_at timestamptz default now()`.
- Alimenté par les Edge Functions existantes (`handle-email-suppression`, `handle-email-unsubscribe`, futures stripe).
- RLS : admin uniquement (SELECT), `service_role` INSERT.

## 3. Frontend — onglet `integrations` dans Paramètres

Nouvel onglet ajouté au groupe **Paramètres** (sidebar admin déjà créée).
Composant `IntegrationsTab.tsx` à 4 cartes empilées :

1. **Connecteurs** — cartes Stripe / Microsoft Graph / Twilio / Mailgun avec badge « Connecté / Non connecté » lu depuis la présence des secrets correspondants (via Edge Function `check-integrations-status` qui retourne juste des booléens, jamais les valeurs).
2. **Webhooks entrants** — liste statique des URLs Edge Function (suppression, unsubscribe, application-tracking…) avec bouton copier.
3. **Clés API sortantes** — table des tokens + bouton « Générer un token » (modale qui affiche la valeur 1 seule fois) + actions Révoquer.
4. **Journal des webhooks** — table paginée de `webhook_events` (50 derniers), filtre par source/status, refresh manuel.

## 4. Edge Functions

- `check-integrations-status` (nouvelle) : retourne `{ stripe: bool, microsoft: bool, twilio: bool, mailgun: bool }` en lisant `Deno.env`.
- `manage-api-token` (nouvelle) : actions `create | revoke | list`. Admin uniquement (vérif role via JWT + `has_role`).
- Pas de modification des fonctions de webhooks existantes dans ce plan (j'ajouterai l'insertion dans `webhook_events` dans une 2ᵉ passe si tu valides l'UI).

## Détails techniques

- Types ajoutés à `AdminTab` : `"integrations"`.
- `settingsGroup` reçoit une 3ᵉ entrée `{ id: "integrations", icon: Plug, label: "Intégrations" }`.
- Tokens : hashage `crypto.subtle.digest('SHA-256', ...)` côté Edge Function ; jamais stocké en clair.
- Statut Stripe lu via la présence des secrets `STRIPE_*` injectés par `enable_stripe_payments`.

## Hors scope (à discuter ensuite)
- Création de produits Stripe + page de checkout.
- Webhook handler Stripe (signature vérifiée) — à brancher quand tu auras des produits.
- Rate-limiting sur les tokens sortants.
- Rotation automatique.

Confirme-moi que ce périmètre est OK et j'enchaîne avec l'activation Stripe puis l'implémentation.