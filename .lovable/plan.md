# Paiements CloudMature — Catalogue, checkout & logique métier

Tu as choisi **les 4 types d'offres** + **multi-devises (CAD / USD / EUR)** + **accès jusqu'à fin de période avec upgrade prorata**. La logique métier post-achat n'a pas été remplie — je propose des défauts ci-dessous, dis-moi quoi ajuster avant que j'enchaîne.

## 1. Catalogue à créer

### A. Abonnements SaaS — Portail client
3 plans, chacun en CAD/USD/EUR mensuel + annuel (économie ~17 %).

| Plan | CAD/mois | USD/mois | EUR/mois | Inclus |
|---|---|---|---|---|
| Starter | 29 | 22 | 19 | Portail, 1 projet actif, 5 Go SharePoint, support email |
| Pro | 89 | 65 | 59 | 5 projets, 50 Go, support prioritaire, factures illimitées |
| Enterprise | 249 | 185 | 169 | Projets illimités, 500 Go, SSO, support 24/7, multi-utilisateurs |

→ Tax code `txcd_10103001` (SaaS).

### B. Formations en ligne — one-shot
Lecture dynamique de `public.trainings` (catalogue déjà en base). Je crée **un produit Stripe par formation active** au moment de l'init (script idempotent), prix défini par le champ `price` à ajouter sur la table (défaut 49 CAD si null). Tax code `txcd_10101000` (formation en ligne).

### C. Acompte / paiement de facture (montant dynamique)
Pas de produit fixe — utilise `price_data` au moment du checkout, monnaie et montant lus depuis la `service_invoice` sélectionnée. Tax code `txcd_20030000` (services pro).

### D. Packs de consulting — forfaits
| Pack | CAD | USD | EUR |
|---|---|---|---|
| Audit Cloud (1 jour) | 1 200 | 890 | 800 |
| Sprint DevOps (5 jours) | 5 500 | 4 100 | 3 700 |
| Accompagnement Mensuel (20 h) | 3 200 | 2 400 | 2 150 |

→ Tax code `txcd_20030000`.

## 2. Logique métier post-paiement (défauts proposés)

| Événement Stripe | Action côté app |
|---|---|
| `customer.subscription.created` (SaaS) | Crée rôle `client_premium` (nouveau, à côté de `client`) + flag `plan_tier` sur `profiles` + email confirmation |
| `customer.subscription.updated` (upgrade/downgrade) | Met à jour `plan_tier` immédiatement (proration gérée par Stripe) |
| `customer.subscription.deleted` ou `cancel_at_period_end=true` | Garde l'accès jusqu'à `current_period_end`, puis retire `client_premium` automatiquement |
| `checkout.session.completed` mode `payment` (formation) | INSERT dans `onboarding_assigned_trainings` (auto-enrôle l'acheteur) + email |
| `checkout.session.completed` mode `payment` (facture) | UPDATE `service_invoices.status = 'payee'` + déclenche le trigger existant `recalculate_project_paid` |
| `checkout.session.completed` mode `payment` (pack consulting) | Crée un `support_ticket` interne « Activation pack X » assigné aux admins + email |
| `invoice.payment_failed` | Notif bell admin + email client, conserve l'accès (status `past_due`) |

**Confirme ou modifie cette liste** — je n'irai pas plus loin sans ton OK sur ce tableau.

## 3. Backend — migrations

1. **`subscriptions`** : table standard Stripe (user_id, stripe_subscription_id, price_id, status, current_period_end, cancel_at_period_end, environment) + RLS user-self-read + service_role-all + fonction `has_active_subscription`.
2. **Ajouts** : colonnes `plan_tier text` sur `profiles`, `price_cents int` + `currency text` sur `trainings`.
3. **Nouveau rôle** : `client_premium` ajouté à l'enum `app_role`.
4. **Trigger** : cron horaire `revoke_expired_premium()` qui retire `client_premium` quand `current_period_end < now()`.

## 4. Edge functions

- `create-checkout` — résout `priceId` via lookup_key, crée Customer avec metadata.userId, mode auto (`payment`/`subscription`), `managed_payments: { enabled: true }` (compte Stripe au Canada ⇒ éligible, +3,5 %), `return_url`. `verify_jwt = false`.
- `create-invoice-checkout` — variante `price_data` pour les factures (montant dynamique).
- `create-portal-session` — billing portal Stripe (annulation/MAJ CB).
- `payments-webhook` — handler dahlia avec les 7 cas du tableau ci-dessus.

## 5. Frontend

- `src/lib/stripe.ts` + `getStripe()` + `getStripeEnvironment()` (token derivation safe).
- `PaymentTestModeBanner` posé sur `/portail` et `/pricing`.
- **`/pricing`** (publique) — 3 plans SaaS, sélecteur devise (CAD/USD/EUR), toggle mois/année. Boutons → embedded checkout.
- **`/portail/abonnement`** — état actuel (plan, prochain renouvellement, badge `cancel_at_period_end`), bouton « Gérer mon abonnement » (portal).
- **Bouton « Payer en ligne »** sur la fiche facture (`ServiceInvoicesTab`) → embedded checkout `price_data`.
- **Page formation** — bouton « S'inscrire (X CAD) » si user n'a pas déjà la formation assignée.
- **`/services/packs`** — 3 cartes pack consulting.
- Page de retour `/checkout/return` (lit `session_id`).

## 6. Hors scope (à faire après)

- Tax codes par formation individuelle (on met le défaut SaaS pour toutes pour démarrer).
- Routing buyer-country pour optimiser le +3,5 % (tout en `managed_payments` au début, plus simple).
- Coupons / codes promo.
- Facturation prorata custom (Stripe gère).
- Multi-seat sur Enterprise (seats fixes pour l'instant).

---

**Pour valider ce plan, j'ai besoin de :**
1. **OK ou ajustements sur les prix** (Starter 29 CAD, Pro 89, Enterprise 249, packs…) — c'est le seul point que je ne peux pas inventer.
2. **OK sur la logique métier** du tableau §2 (en particulier : créer le rôle `client_premium` ? auto-enrôler les formations ? marquer facture payée auto ?).
3. **OK sur le scope** — si tu veux qu'on découpe et qu'on commence par 1 seule offre (ex: SaaS seul d'abord), dis-le, ça réduit énormément le diff.