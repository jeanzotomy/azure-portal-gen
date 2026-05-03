## Diagnostic

L'onglet **Mes candidatures** filtre sur `job_applications.user_id = auth.uid()`. Or quand un visiteur postule sans être connecté (ou via un autre compte), `user_id` reste `NULL`. La candidature existe bien en base mais n'est pas rattachée au compte → l'onglet apparaît vide.

Exemple en base : `memthem@gmail.com` a une candidature **acceptée** mais `user_id = NULL`. Si cette personne se crée ensuite un compte avec le même email, sa candidature ne lui est jamais rattachée.

## Solution

### 1. Rattachement rétroactif (migration SQL)
Mettre à jour toutes les `job_applications` où `user_id IS NULL` mais dont l'`email` correspond à un utilisateur existant dans `auth.users`. Idem pour `onboarding_processes` (même problème potentiel via `candidate_email`).

### 2. Rattachement automatique futur (trigger)
Créer un trigger sur `auth.users` (AFTER INSERT) — ou étendre le trigger `handle_new_user` existant — qui :
- met à jour `job_applications.user_id` pour toutes les lignes où `email = NEW.email AND user_id IS NULL`
- fait pareil sur `onboarding_processes` (`candidate_email`)

Ainsi, dès qu'un candidat crée son compte (via le lien d'invitation onboarding ou spontanément), ses candidatures et son dossier d'onboarding lui sont automatiquement rattachés.

### 3. Filet de sécurité côté UI (`ApplicationsTab.tsx`)
Modifier la requête de chargement pour inclure aussi les candidatures où `email = user.email AND user_id IS NULL` :
```ts
.or(`user_id.eq.${user.id},and(user_id.is.null,email.eq.${user.email})`)
```
Et au passage, faire un UPDATE pour rattacher définitivement ces lignes (équivalent à ce que fait déjà `OnboardingPage` avec `candidate_email`).

### 4. RLS
Ajouter une politique SELECT sur `job_applications` autorisant un user à voir les candidatures dont l'`email` correspond à son email auth, même si `user_id` est NULL — sinon le filet UI ne fonctionnera pas tant que le trigger n'a pas tourné.

## Résultat attendu

- L'utilisateur `memthem@gmail.com` (et tous les autres dans le même cas) verront immédiatement leur candidature acceptée dans l'onglet.
- Tout nouveau candidat qui crée son compte après avoir postulé verra automatiquement ses candidatures.
- Les futures invitations onboarding fonctionneront sans étape manuelle de rattachement.

## Fichiers touchés

- **Nouvelle migration SQL** : backfill `user_id` + trigger `link_applications_on_signup` sur `auth.users`
- **`src/components/ApplicationsTab.tsx`** : requête élargie (user_id OR email match) + auto-link
- **Migration RLS** : politique SELECT additionnelle sur `job_applications` pour matching par email auth
