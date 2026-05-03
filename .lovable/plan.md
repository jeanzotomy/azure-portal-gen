## Objectif

Restructurer l'onglet **RH** (présent dans le portail Admin et dans le portail RH `/rh`) pour regrouper toutes les actions RH dans une vue cohérente avec 4 sous-onglets :

1. **Recrutement** – offres + candidatures (existant)
2. **Contrats** – génération PDF auto + assignation aux candidats acceptés
3. **Formations** – bibliothèque de liens de formation, assignation aux candidats par poste
4. **Onboarding** – suivi des dossiers (existant)

## Sous-onglet 1 — Recrutement

Reprend tel quel le contenu actuel des onglets « Offres » + « Candidatures » de `HrTab.tsx` (les deux fusionnés dans une seule vue avec un sélecteur interne, ou conservés en deux sections empilées). L'historique d'envoi d'emails reste accessible via un bouton dans le header.

## Sous-onglet 2 — Contrats (nouveau)

Liste de **tous les candidats au statut « Acceptée »** (jointure `job_applications` ↔ `onboarding_processes` ↔ `onboarding_contracts`). Chaque ligne affiche :

- Nom + email du candidat, poste, date d'acceptation
- Statut du contrat : *Non généré* / *Généré, en attente de signature* / *Signé le …*
- Actions :
  - **Générer le contrat automatiquement** (appelle l'edge function existante `generate-contract` → PDF auto + dépôt SharePoint + insertion `onboarding_contracts`)
  - **Déposer manuellement un PDF** (fallback existant)
  - **Télécharger** / **Voir la signature**
  - **Régénérer** (si non signé)

Filtres : recherche, statut contrat, poste.

## Sous-onglet 3 — Formations (nouveau)

Deux sections :

**A. Bibliothèque de formations**
- CRUD sur une nouvelle table `trainings` : titre, description, URL (lien externe Udemy/YouTube/SharePoint…), durée estimée, catégorie, postes ciblés (multi-sélection sur `job_postings.title` libre), actif/inactif.
- Bouton « Ajouter une formation » + édition inline.

**B. Assignation aux candidats**
- Liste des candidats acceptés (même source que sous-onglet Contrats).
- Pour chaque candidat : voir les formations déjà assignées, badges « Suggérées pour son poste » (matching automatique sur le titre du poste), bouton « Assigner » qui ouvre un dialog de sélection multiple.
- Les formations assignées s'affichent ensuite côté candidat dans son portail Onboarding (étape « Formation & Quiz »).

## Sous-onglet 4 — Onboarding

Reprend `OnboardingAdminTab` actuel (suivi détaillé : étapes, documents candidat, messages, signature). On garde le mode `readOnly` pour le portail RH si besoin.

## Modifications base de données

Nouvelle table **`trainings`** :
- `title`, `description`, `url`, `duration_minutes`, `category`, `target_job_titles` (text[]), `active`, `created_by`
- RLS : Admin/Gestionnaire/HR gèrent ; tout authentifié peut lire les actifs.

Nouvelle table **`onboarding_assigned_trainings`** :
- `process_id` (→ `onboarding_processes`), `training_id` (→ `trainings`), `assigned_by`, `assigned_at`, `completed_at`, `notes`
- RLS : RH/Admin/Gestionnaire CRUD ; le candidat propriétaire du `process_id` peut lire et mettre `completed_at`.

## Modifications côté candidat (portail `/portal` → Mon onboarding)

L'étape « Formation & Quiz » affiche désormais la liste des formations assignées (titre, durée, lien externe, bouton « Marquer comme suivie »). Si aucune formation assignée, message d'attente.

## Fichiers impactés

- `src/components/HrTab.tsx` — refonte des `TabsList` en 4 sous-onglets : `recruitment`, `contracts`, `trainings`, `onboarding`. Extraction du contenu existant (offres + candidatures) dans un sous-composant `RecruitmentSection`.
- `src/components/hr/ContractsTab.tsx` — nouveau, basé sur la logique `generateContract` déjà présente dans `OnboardingAdminTab`.
- `src/components/hr/TrainingsTab.tsx` — nouveau (CRUD bibliothèque + assignation).
- `src/components/OnboardingTab.tsx` — afficher les formations assignées dans l'étape `training`.
- Migration SQL : tables `trainings` + `onboarding_assigned_trainings` + RLS.

Aucune modification des routes : l'onglet « RH » reste accessible via les portails Admin (`/admin`) et RH (`/rh`) déjà en place.
