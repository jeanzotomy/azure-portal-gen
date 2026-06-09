## Redesign du module Formation

Direction visuelle verrouillée : **Navy Trust** (#0f1b3d / #1e3a5f / #0099cc / #e8edf3) — alignée sur l'identité CloudMature existante, glassmorphism conservé, headers dialog navy→cyan. Aucune dérive purple/indigo générique.

Pattern UI verrouillé : **pages dédiées partout** pour les formulaires longs. Modales conservées uniquement pour confirmations courtes (supprimer, retirer une assignation).

---

### 1. Nouvelles routes (React Router)

```text
/admin/formations                       → Tableau de bord formations (KPIs globaux)
/admin/formations/catalogue             → Liste des modules (CRUD)
/admin/formations/catalogue/nouveau     → Création d'un module (multi-step)
/admin/formations/catalogue/:id         → Détail + édition (vidéo, quiz, prérequis)
/admin/formations/assignations          → Annuaire users + KPIs d'assignation
/admin/formations/assignations/:userId  → Page détail user : assigner / retirer / voir progression

/rh/formations                          → Même vue que /admin/formations mais scoped HR
/rh/formations/assignations/:userId     → Idem côté RH

/portal/formations                      → Mes formations continues (cards)
/portal/formations/:processItemId       → Player plein écran (vidéo + quiz + commentaires)
/portal/onboarding                      → Parcours onboarding (timeline)
/portal/onboarding/training/:itemId     → Player onboarding plein écran
```

Toutes protégées par `AuthGuard` + rôles existants (`admin`/`agent`/`gestionnaire` ; `hr` ; user authentifié).

---

### 2. Surfaces redessinées

**A. Admin / RH — Centre de formation**
- Hero header navy avec breadcrumb + KPIs (modules actifs, users en cours, taux complétion, score moyen).
- 3 onglets-cards : Catalogue / Assignations / Certificats.
- Catalogue : grille de cards (thumbnail, durée, # modules, statut). Bouton `+ Nouveau module` → page de création.
- Assignations : split-screen — liste users (recherche, filtres rôle/statut) à gauche, panneau de détails à droite OU navigation vers `/admin/formations/assignations/:userId`.
- Pages création/édition : form en 3 sections (Infos générales, Contenu vidéo, Quiz). Sticky footer "Enregistrer / Publier".

**B. User — Mes formations (continu)**
- Page `/portal/formations` : hero "Mon parcours", stat row (assignées, en cours, complétées, certificats), grille de cards formations avec barre de progression et badge gamification.
- Click card → page player `/portal/formations/:id` plein écran (sidebar gauche : modules + checkmarks ; main : vidéo + transcription ; tabs : Quiz / Commentaires / Tuteur IA / Certificat).

**C. User — Onboarding**
- Page `/portal/onboarding` : timeline verticale visuelle (steps actuels conservés) + accès rapide formations onboarding.
- Player onboarding identique au player formation continue (composant partagé).

---

### 3. Composants partagés à créer

| Composant | Rôle |
|---|---|
| `TrainingHeader` | Hero navy + breadcrumb + KPIs |
| `TrainingStatsRow` | Row de 4 stat-cards glassmorphism |
| `TrainingCard` | Card formation (catalogue + portail user) |
| `TrainingPlayerLayout` | Layout split sidebar/main réutilisable |
| `AssignmentUserList` | Annuaire users avec filtres + recherche |
| `TrainingFormShell` | Wrapper page-form avec sticky footer Save/Cancel |

Tokens existants réutilisés (pas de nouveaux). Headers gradient `from-primary to-[#007aa3]` conservés sur les cards/sections clés. Glassmorphism (`bg-white/5 backdrop-blur border-white/10`) appliqué aux cards et stat rows.

---

### 4. Migration des écrans existants

| Existant | Devient |
|---|---|
| `EmployeeTrainingManager.tsx` (tab admin) | Pages `/admin/formations/*` |
| Dialog "Assigner une formation" | Page `/admin/formations/assignations/:userId` |
| `OnboardingTab.tsx` (1344 lignes) | Découpé : `OnboardingTimelinePage` + `TrainingPlayerPage` partagé |
| `EmployeeTrainingsTab.tsx` | Page `/portal/formations` + redirection depuis l'onglet |
| Modales création/édition module | Pages `/admin/formations/catalogue/*` |

L'onglet existant dans `PortalPage` et `AdminPage` reste comme entry-point mais redirige (`navigate`) vers les nouvelles routes pour préserver les liens internes le temps de la transition.

---

### 5. Hors-scope explicite

- Aucun changement backend (RLS, RPC, schema) — toutes les RPC existantes (`assign_employee_training`, `list_employee_trainings_for_user`, etc.) sont réutilisées.
- Pas de nouveau token de couleur, pas de changement de typographie.
- Pas de touch à la logique métier (gamification, certificats, partage social, vérification publique).
- I18n FR/EN : nouvelles clés ajoutées via le contexte existant, pas de refonte du système.

---

### Détails techniques

- Découper `OnboardingTab.tsx` en sous-composants avant migration pour limiter la dette.
- `TrainingPlayerPage` accepte `mode: "onboarding" | "employee"` pour brancher la bonne RPC.
- Sticky footer des formulaires : `position: sticky; bottom: 0; bg-background/80 backdrop-blur`.
- AuthGuard sur `/admin/formations/*` et `/rh/formations/*` : mêmes rôles que `AdminPage` / `HrPortalPage`.
- Mobile : sidebar player → Sheet, split-screen assignations → stack.

---

**Prêt à implémenter ?** Je commence par les routes + le shell des pages admin (Catalogue + Assignations), puis le player partagé, puis le portail user.