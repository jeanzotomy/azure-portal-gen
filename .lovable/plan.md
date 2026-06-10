
## Vague 2 — Cohérence UX & architecture

### V2.1 — `HrTab` : `TabsTrigger` + `activeTab` contrôlé
- Ajouter une `TabsList` avec `TabsTrigger` pour `recruitment / contracts / onboarding / trainings` (déjà géré côté `HrPortalPage`, mais `HrTab` doit accepter `value`/`onValueChange` cohérents).
- Supprimer `key={sub}` dans `HrPortalPage` → passer `activeTab` + `onTabChange` en prop contrôlée (déjà en place mais le remontage forcé persiste). Vérifier qu'un seul `Tabs` orchestre l'état.
- Wrapper `filteredJobs` / `filteredApps` dans `useMemo`.

### V2.2 — Migration `useToast` → `sonner` dans `HrTab`
- Remplacer tous les `toast({ title, description, variant })` par `toast.success(...) / toast.error(...)` (`import { toast } from "sonner"`).
- Supprimer l'import `useToast`.

### V2.3 — Token gradient partagé
- Ajouter `--gradient-primary-deep: linear-gradient(135deg, hsl(var(--primary)), #007aa3)` dans `src/index.css`.
- Étendre `tailwind.config.ts` avec `backgroundImage: { "gradient-primary-deep": "var(--gradient-primary-deep)" }`.
- Remplacer dans `HrTab.tsx`, `ContractsTab.tsx`, `OnboardingAdminTab.tsx`, `TrainingsTab.tsx`, `OnboardingTab.tsx`, `EmployeeTrainingManager.tsx` toutes les occurrences `bg-gradient-to-r from-primary to-[#007aa3]` (et variantes inline) par `bg-gradient-primary-deep`.

### V2.4 — `DialogDescription` manquantes
- Audit rapide des dialogs RH : ajouter `<DialogDescription>` quand manquant (warning Radix). Cibles probables : `HrTab` (dialog candidature), `OnboardingAdminTab` (dialog refus), `TrainingsTab` (dialog assignation).

### V2.5 — `DialogTitle` blanc sur blanc dans `HrTab`
- Wrapper l'en-tête concerné (lignes ~813-820) dans un `bg-gradient-primary-deep text-primary-foreground` cohérent.

---

## Vague 3 — Innovations

### V3.1 — `HrSectionHeader` partagé
- Créer `src/components/hr/HrSectionHeader.tsx` : titre + icône + compteur + actions (slot `right`) + bouton "Actualiser" optionnel.
- Le brancher dans `ContractsTab`, `TrainingsTab`, `OnboardingAdminTab`, et le nouveau Dashboard.

### V3.2 — Dashboard RH
- Créer `src/components/hr/HrDashboardTab.tsx` :
  - **4 KPI** (cards) : Candidatures du mois, Acceptées (taux), Onboarding en cours, Formations à compléter (< 7 j).
  - **Funnel recrutement** (recharts FunnelChart ou barres horizontales) : reçue → en revue → entretien → acceptée.
  - **Alertes du jour** : contrats non signés > 7j, onboardings bloqués > 14j, formations en retard.
  - Requêtes : `job_applications` (groupé par status + date), `onboarding_processes`, `onboarding_assigned_trainings`.
- Ajouter onglet "Vue d'ensemble" en tête de `HrPortalPage` + branche dans `HrTab` (activeTab `"dashboard"`).

### V3.3 — Export CSV
- Installer `papaparse`.
- Ajouter bouton "Exporter CSV" dans `ContractsTab`, `HrTab` (candidatures), `OnboardingAdminTab`, `TrainingsTab` (assignations).
- Helper `src/lib/csv-export.ts` : `exportCsv(filename, rows)` qui sérialise via Papa.unparse + déclenche download.

---

## Détails techniques

**Aucune migration BD nécessaire** — toutes les données existent déjà (`job_applications`, `onboarding_processes`, `onboarding_assigned_trainings`).

**Fichiers principaux modifiés :**
- `src/index.css`, `tailwind.config.ts` (token gradient)
- `src/components/HrTab.tsx` (TabsTrigger, useMemo, sonner, gradient, DialogDescription, DialogTitle fix)
- `src/components/hr/ContractsTab.tsx`, `src/components/hr/TrainingsTab.tsx`, `src/components/OnboardingAdminTab.tsx`, `src/components/OnboardingTab.tsx`, `src/components/admin/EmployeeTrainingManager.tsx` (gradient token)
- `src/pages/HrPortalPage.tsx` (onglet dashboard, suppression remontage)

**Fichiers créés :**
- `src/components/hr/HrSectionHeader.tsx`
- `src/components/hr/HrDashboardTab.tsx`
- `src/lib/csv-export.ts`

**Dépendance ajoutée :** `papaparse`

---

## Plan de déploiement
```text
1. Token gradient + index.css/tailwind
2. Migration sonner dans HrTab + useMemo + DialogDescription/Title
3. HrPortalPage: dashboard tab + activeTab contrôlé
4. Composant HrSectionHeader + branchements
5. Composant HrDashboardTab (KPI + funnel + alertes)
6. csv-export helper + boutons d'export
7. Remplacement des gradients inline dans 6 fichiers
8. Vérification build/typecheck
```
