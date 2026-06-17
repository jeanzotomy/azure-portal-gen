## Objectifs

1. **En-têtes plus aérés** sur 4 zones de formulaires
2. **/careers en 2 colonnes** : offres à gauche, filtres + candidature spontanée à droite (sticky)
3. **Suivi RH avancé** : Kanban drag&drop, fiche candidat enrichie, dashboard étoffé, exports

---

## 1. En-têtes de formulaires

Tous les en-têtes auront le même rythme : icône carrée (40px) + titre + sous-texte sur 1 ligne, **actions séparées dans une rangée dédiée** au lieu d'être collées au titre.

- **`JobApplicationDialog`** (`src/components/JobApplicationDialog.tsx`)
  - `DialogHeader` : padding `pb-4 border-b mb-2`, titre + badge "Sans inscription" sur sa propre ligne, sous-titre du poste en dessous (au lieu de tout coller)
- **`HrSectionHeader`** (`src/components/hr/HrSectionHeader.tsx`)
  - Passage en flex-col sur mobile, ajout d'un sous-titre optionnel, espace `gap-4` au lieu de `gap-3`, séparation visuelle `pb-3 border-b`
- **En-tête /rh** (`src/pages/HrPortalPage.tsx`)
  - Hauteur passe de `h-14` à `h-16`, conteneur `max-w-[1400px] mx-auto`, regroupement avatar+nom dans un bloc, bouton logout avec libellé "Déconnexion" sur ≥ md
- **`FormSection`** (`src/components/ui/form-section.tsx`)
  - Padding header `pb-5`, gap `gap-4`, action repoussée à droite avec marge `ml-auto`, retour à la ligne propre sur mobile

## 2. Page /careers — 2 colonnes

Structure : `grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8`
- **Gauche** : barre de recherche + liste d'offres (le contenu actuel sauf "spontanée" et la grille de filtres)
- **Droite (sticky `top-24`)** :
  - **Bloc Filtres** : type, département, lieu, secteur — empilés verticalement + reset
  - **Bloc Candidature spontanée** : 3 cartes (Emploi / Stage / Freelance) empilées
- Le `max-w-5xl` devient `max-w-7xl` pour donner de l'air

## 3. Suivi RH complet

### 3a. Pipeline candidats — Kanban drag & drop

Nouveau composant **`src/components/hr/CandidatesKanban.tsx`** (utilisé dans l'onglet Recrutement de `HrTab.tsx`).

- 5 colonnes correspondant aux statuts existants : `nouvelle`, `en_revue`, `entretien`, `acceptee`, `refusee`
- Carte candidat : nom, poste cible (jointure `job_postings.title`), badges (score IA si présent, date), petit bouton "Voir"
- DnD avec `@dnd-kit/core` (déjà courant — sinon HTML5 natif via `draggable` pour rester sans dépendance)
- Au drop : `UPDATE job_applications SET status` → déclenche déjà l'email automatique (trigger `notify_application_status_change` existant). Si cible = `entretien`, ouvrir le dialog de message d'entretien existant.
- Toggle "Vue Liste / Vue Kanban" en haut de l'onglet Recrutement (préserve la vue actuelle)

### 3b. Fiche candidat enrichie

Nouveau composant **`src/components/hr/CandidateDetailDrawer.tsx`** (Sheet plein écran à droite).

- Ouverture via clic sur une carte Kanban ou bouton "Détails" en vue liste
- Sections :
  - **Identité** : nom, email, téléphone, LinkedIn, portfolio
  - **Candidature** : poste, date, tracking_id, statut (changeable), salaire souhaité, années d'expérience
  - **Fichiers** : CV + lettre (boutons de prévisualisation déjà existants)
  - **Analyse IA** : score, % match, résumé, forces, faiblesses, compétences, reco (réutilise les champs `ai_*` déjà en base) + bouton "Relancer l'analyse"
  - **Notes RH internes** : textarea liée à `job_applications.notes`, bouton "Enregistrer"
  - **Historique** : created_at, updated_at, ai_analyzed_at, interview_message
- Actions rapides en footer : Changer statut, Inviter à un entretien, Télécharger tous les fichiers

### 3c. Dashboard RH enrichi

Mise à jour de **`src/components/hr/HrDashboardTab.tsx`** :

- KPIs ajoutés :
  - **Délai moyen de traitement** (jours entre `created_at` et `updated_at` pour les candidatures finalisées)
  - **Top 3 offres** par volume de candidatures
  - **Taux d'entretien** (entretien+acceptée / total)
- Nouveau graphique : **candidatures par jour sur 30 jours** (LineChart Recharts)
- Conserve le funnel existant + alertes

### 3d. Export CSV

Bouton **"Exporter CSV"** dans :
- Onglet Recrutement → exporte les candidatures filtrées (`exportCsv` déjà importé dans HrTab)
- Dashboard → exporte le snapshot KPIs du jour

Colonnes : tracking_id, full_name, email, phone, job_title, status, ai_score, created_at, updated_at

---

## Hors périmètre

- Pas de migration SQL : toutes les colonnes nécessaires existent déjà (`ai_*`, `notes`, `interview_message`, `tracking_id`)
- Pas de modification de la logique des emails (les triggers existants envoient déjà les notifications de statut)
- Pas de refonte design system / couleurs

## Détail technique

- **DnD** : utilisation de `@dnd-kit/core` + `@dnd-kit/sortable` (ajout via `bun add`)
- **Sheet** : composant shadcn déjà présent (`src/components/ui/sheet.tsx`)
- Les statuts kanban respectent le type `AppStatus` existant
- Tous les changements de statut passent par la même mutation Supabase → conserve les triggers d'emails
