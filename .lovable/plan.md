## Objectif

Permettre **deux types d'assignation de formation** :

1. **Onboarding d'intégration** — comportement actuel (déjà en place via `onboarding_processes` lié à une candidature acceptée).
2. **Formation continue employé** — nouvelle assignation directe à un utilisateur, gérée depuis un **menu dédié dans chaque profil utilisateur**, réservée à **Admin et RH**.

L'utilisateur retrouve ses formations dans deux espaces séparés. Les statistiques, quiz, certificats, commentaires et gamification continuent de fonctionner pour les deux types — sans dupliquer la logique existante.

## Approche technique

On réutilise `onboarding_processes` comme conteneur générique et on lui ajoute un champ `kind`.

```text
onboarding_processes
 ├─ kind = 'onboarding'         (1 par candidature acceptée) — existant
 └─ kind = 'employee_training'  (1 par utilisateur, créé à la demande)
```

Chaque utilisateur n'aura **qu'un seul** process `employee_training` (contrat d'unicité) dans lequel s'accumulent toutes les formations continues qu'on lui assigne. Tous les triggers / fonctions existants (`can_access_training`, gamification, certificats, commentaires, cohort feed) marchent **sans modification**.

## Lot — Migration SQL

- Colonne `kind text not null default 'onboarding'` sur `onboarding_processes` + check (`'onboarding' | 'employee_training'`).
- Index unique partiel : `(user_id) WHERE kind = 'employee_training'`.
- Fonction `get_or_create_employee_process(_user_id uuid)` — SECURITY DEFINER, refusée si l'appelant n'est pas admin ou RH.
- Fonction `assign_employee_training(_user_id uuid, _training_id uuid)` — crée le process si besoin puis `INSERT … ON CONFLICT DO NOTHING` dans `onboarding_assigned_trainings` (source = `'employee'`).
- Fonction `unassign_employee_training(_user_id uuid, _training_id uuid)` — DELETE conditionnée à la non-complétion (sinon on garde l'historique).
- Fonction `list_employee_assignable_users()` — admin/RH seulement, retourne id, nom, email, nb formations actives, nb complétées.
- Fonction `list_employee_trainings_for_user(_user_id uuid)` — admin/RH **ou** l'utilisateur lui-même.
- Adaptations RLS triviales : les policies actuelles sur `onboarding_assigned_trainings` filtrent déjà par `process.user_id = auth.uid()` → fonctionnent telles quelles pour les deux `kind`.

## Lot — UI utilisateur

Nouveau composant **`EmployeeTrainingsTab.tsx`** (séparé de `OnboardingTab`) :

- Visible dans le portail utilisateur sous un nouvel onglet « Mes formations » dans la sidebar/profil.
- Réutilise les sous-composants existants : lecteur vidéo, quiz, commentaires, certificat, gamification.
- Cache complètement l'UI « onboarding » (étapes, contrat, documents) — uniquement la liste des formations assignées avec progression.

`OnboardingTab` reste inchangé et continue de ne montrer que les formations du process `kind = 'onboarding'`.

## Lot — UI Admin & RH

Nouveau composant **`EmployeeTrainingManager.tsx`** intégré :

- Sous un nouvel onglet **« Formations employés »** dans `AdminPage` (visible Admin) et `RHPage` (visible RH).
- Liste des utilisateurs (recherche, filtre par département si dispo).
- Pour l'utilisateur sélectionné, panneau de droite avec :
  - Formations déjà assignées (avec source, statut, score, date complétion).
  - Bouton « Assigner une formation » → modal avec recherche dans le catalogue `trainings` actif.
  - Bouton retrait sur les formations non encore complétées.
- KPIs : nb d'utilisateurs avec formation en cours, taux de complétion, score moyen.

## Récap

```text
                ┌─ Onboarding (intégration) ────► OnboardingTab (inchangé)
Process kind ───┤
                └─ Employee training ──────────► EmployeeTrainingsTab (nouveau)
                                                  ▲
                              assigné par Admin/RH│ via EmployeeTrainingManager
```

Aucune donnée existante n'est migrée ni cassée : tous les process actuels gardent `kind = 'onboarding'` par défaut.
