# Plan — Module RH CloudMature : audit, corrections, innovations

Basé sur l'audit ci-dessus. Découpé en **3 vagues** indépendantes pour livrer la valeur progressivement et limiter les risques.

---

## Vague 1 — Bugs critiques & sécurité (livrable rapide)

Objectif : stopper les fuites de données, débloquer l'accès RH, durcir la sécurité. Pas de refonte visuelle.

### 1.1 — Fuite inter-process (P1)
- **ContractsTab.tsx** : ajouter `.eq("kind", "onboarding")` sur la requête `onboarding_processes`
- **TrainingsTab.tsx** : idem + filtrer `kind='onboarding'` partout où la liste de candidats est utilisée pour assigner
- **OnboardingAdminTab.tsx** : vérifier et ajouter le filtre `kind='onboarding'`

### 1.2 — Ownership lecteur de formation employé (#4)
- **EmployeeTrainingPlayerPage.tsx** : ajouter un join sur `onboarding_processes` filtré par `user_id = auth.uid()` ; si non trouvé → redirect `/portal/formations` avec toast.

### 1.3 — Fallback email pour `kind='employee_training'` (#11)
- **EmployeeTrainingsListPage.tsx** : reprendre le pattern de `OnboardingTab.tsx` (search par `user_id` puis fallback par email, et update `user_id` si trouvé). Limité au scope `kind='employee_training'`.

### 1.4 — Accès RH aux formations employés (P2)
- Ajouter la route `/rh/formations` dans `App.tsx` (nested sous `/rh`) avec `EmployeeTrainingManager` (autorisé pour rôle `hr`).
- Ajouter l'onglet "Formations employés" dans `HrPortalPage` (5e item dans `SUBS`).
- Adapter `EmployeeTrainingManager` pour accepter une prop `basePath: "/admin" | "/rh"` afin que les boutons "Assigner" naviguent vers le bon scope.
- S'assurer que le shell `HrPortalPage` rend `<Outlet />` quand la route enfant `/rh/formations` est active (déjà fait pour `/rh/formations/assignations/:userId`).

### 1.5 — Remplacements `window.confirm` / `window.prompt` (P4)
- **TrainingsTab.tsx:202** : `useConfirm()` pour la suppression de formation.
- **OnboardingAdminTab.tsx:247** : remplacer `prompt("Raison du refus ?")` par un petit `Dialog` avec textarea (réutilisable via composant `<RejectionReasonDialog>`).

---

## Vague 2 — Cohérence UX & architecture (qualité)

### 2.1 — Réparer l'architecture HrTab (P3)
- Ajouter les 4 `TabsTrigger` (`recruitment`, `contracts`, `trainings`, `onboarding`) dans `HrTab.tsx`. Masquer la `TabsList` via `hidden` quand HrTab est utilisé depuis `HrPortalPage` (qui a déjà sa propre nav).
- Supprimer `key={sub}` dans `HrPortalPage.tsx` ; piloter le tab via une prop `activeTab` contrôlée. Cela évite le remontage complet + 4 requêtes Supabase à chaque navigation.

### 2.2 — Unifier le système de toast
- Choisir `sonner` (déjà majoritaire) → migrer `HrTab.tsx` qui utilise `useToast()`.

### 2.3 — Factoriser les filtres dupliqués (D1, D2)
- Extraire `filteredJobs` et `filteredApps` en `useMemo` au niveau du composant `HrTab` ; supprimer les IIFE.

### 2.4 — Token CSS pour le gradient navy (#16, D6)
- Ajouter `--gradient-primary: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-deep)));` dans `index.css`.
- Définir `--primary-deep: 197 100% 32%` (= #007aa3 en HSL) à côté de `--primary`.
- Étendre `tailwind.config.ts` : `backgroundImage.gradient-primary`.
- Remplacer `bg-gradient-to-r from-primary to-[#007aa3]` par `bg-gradient-primary` dans les 6 fichiers identifiés.

### 2.5 — DialogDescription manquantes (#10)
- Ajouter `<DialogDescription className="sr-only">…</DialogDescription>` aux dialogs identifiés (ou `aria-describedby={undefined}` explicite si pas de description).
- Corriger spécifiquement le **DialogTitle blanc sur fond blanc** dans `HrTab.tsx:813-820` (gradient header manquant).

---

## Vague 3 — Innovations RH (valeur ajoutée)

### 3.1 — Tableau de bord RH (R1)
- Nouvel onglet "Dashboard" dans HrPortalPage (premier onglet par défaut).
- 4 stat-cards : candidatures (30j), onboarding en cours, formations en retard (>30j non démarrées), contrats en attente signature (>7j).
- 1 graphique funnel recrutement (Recharts BarChart horizontal).
- 1 liste "À traiter aujourd'hui" : 5 alertes prioritaires cliquables.

### 3.2 — Export CSV (R3)
- Bouton "Exporter CSV" dans les en-têtes des onglets `recruitment`, `contracts`, `trainings`.
- Utiliser `papaparse` (déjà léger, ~30Ko). Exports filtrés selon la recherche/statut courants.

### 3.3 — Composant partagé `<HrSectionHeader>` (R5)
- Wrapper réutilisable : icon, titre, sous-titre, slot actions (RefreshCw + boutons custom), gradient navy en option.
- Migrer les en-têtes des 4 onglets vers ce composant.

---

## Hors-scope (à proposer dans un futur plan)

- Découpage complet de `OnboardingTab` (1344 lignes) — chantier de refactoring lourd, à isoler.
- Système d'alertes automatiques email (Edge Function cron) — backend complexe, demande un plan dédié.
- Vue calendrier onboarding (R2) — UI lourde, prioriser après le dashboard.
- Parcours-types (R7) — nouvelle table SQL `training_paths` + UI.
- i18n du module RH (#15) — chantier transverse.

---

## Détails techniques

### Tables / RPC concernées (lecture seule, aucune migration nécessaire en V1)
- `onboarding_processes` (clé : `kind ∈ {'onboarding','employee_training'}`)
- `onboarding_assigned_trainings`, `trainings`
- RPC existantes utilisées : `list_employee_assignable_users`, `assign_employee_training`, `unassign_employee_training`, `get_or_create_employee_process`

### Sécurité
- `EmployeeTrainingPlayerPage` : double contrôle (RLS + applicatif) sur `user_id`.
- RH a déjà les permissions sur `assign_employee_training` / `unassign_employee_training` (RPC vérifie `has_role hr`). Aucun changement RLS nécessaire pour Vague 1.4.

### Risques & mitigations
- **Risque** : ajouter `.eq("kind", "onboarding")` peut "cacher" des dossiers qui étaient incorrectement visibles. → Acceptable car c'est précisément l'intention.
- **Risque** : supprimer `key={sub}` peut introduire des bugs d'état entre onglets. → Mitigation : passer `activeTab` comme prop contrôlée + reset des filtres sur changement explicite si nécessaire.
- **Risque** : token `--primary-deep` ajouté à `index.css` modifie le rendu si une autre couleur s'appelle déjà comme ça. → Vérification rapide avant.

---

## Ordre de livraison proposé

1. **Vague 1** (corrections critiques) — déployable immédiatement, faible risque, gros impact.
2. **Vague 2** (cohérence) — après validation visuelle de la Vague 1.
3. **Vague 3** (innovations) — uniquement après V1+V2 stables.

Je commence par la **Vague 1** dès validation, puis te montre le résultat avant d'enchaîner.
