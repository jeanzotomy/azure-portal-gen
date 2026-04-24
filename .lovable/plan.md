# 📧 Notifications candidature + Invitation portail (magic link)

## 🎯 Objectif
Quand l'admin change le statut d'une candidature, le candidat reçoit automatiquement un email français adapté. Si "acceptée" → magic link 1-clic pour activer son compte client.

---

## 1️⃣ Infrastructure email transactionnelle
- Scaffold du système email transactionnel Lovable (réutilise le domaine `notify.cloudmature.com` déjà configuré)
- Crée la fonction `send-transactional-email` + page `/unsubscribe` + registry de templates

## 2️⃣ Migration SQL
- **Ajout colonne** `interview_message TEXT` à `job_applications` (message custom pour l'email d'entretien)
- **Trigger** `on_application_status_change` sur `job_applications`:
  - Se déclenche `AFTER UPDATE` quand `OLD.status IS DISTINCT FROM NEW.status`
  - Appelle l'edge function `notify-application-status` en async via `pg_net.http_post` avec service-role key (stockée dans Vault)

## 3️⃣ Edge Function `notify-application-status` (nouvelle)
- Reçoit `application_id` + `new_status`
- Récupère candidature complète + offre d'emploi (titre, département)
- Branche selon le statut :
  - `en_revue` → invoke `send-transactional-email` template `application-en-revue`
  - `entretien` → template `application-entretien` + `interview_message`
  - `acceptee` → génère magic link via `auth.admin.generateLink({ type: 'invite', email, options: { redirectTo: '/auth?welcome=1' } })` → template `application-acceptee` avec bouton magic link
  - `refusee` → template `application-refusee`
- Idempotency key : `app-status-{id}-{status}`

## 4️⃣ Templates React Email (4 fichiers, brand CloudMature navy/cyan)
- `application-en-revue.tsx` — "Votre candidature pour [poste] est en cours d'examen"
- `application-entretien.tsx` — "Invitation à un entretien" + message custom de l'admin (date/visio/lieu)
- `application-acceptee.tsx` — 🎉 "Félicitations" + bouton "Activer mon compte CloudMature" (magic link)
- `application-refusee.tsx` — Message courtois en français
- Tous : 100% français, fond blanc, header logo CloudMature, couleur primaire #0099cc

## 5️⃣ UI Admin — `HrTab.tsx`
- **Statut → `entretien`** : ouvre un petit dialog demandant le message personnalisé (date, lieu/visio, instructions) **avant** de valider la mise à jour
- **Autres statuts** : changement direct + toast *"Statut mis à jour. Le candidat sera notifié par email."*
- **Indicateur visuel** : badge "📧 Notifié" à côté de chaque candidature (lecture rapide depuis `email_send_log` filtré par `recipient_email`)

## 6️⃣ Page d'accueil candidat accepté — `AuthPage.tsx`
- Détecte query param `?welcome=1`
- Affiche un bandeau de bienvenue : *"🎉 Félicitations pour votre candidature ! Créez votre mot de passe pour finaliser votre intégration à CloudMature."*

## 7️⃣ Sécurité & traçabilité
- Trigger uniquement si `OLD.status IS DISTINCT FROM NEW.status` → pas de spam
- Idempotency keys → pas de doublon si l'admin change 2× rapidement
- Suppression list email respectée automatiquement (système Lovable)
- Tous les envois loggués dans `email_send_log` (visible côté admin)
- Magic link expiration : 7 jours (réglage Supabase auth)

---

## ✅ Résultat attendu pour le candidat

| Statut admin | Email reçu |
|---|---|
| `en_revue` | "Votre candidature pour [Poste] est en cours d'examen" |
| `entretien` | "Nous souhaitons vous rencontrer" + message custom admin |
| `acceptee` | "🎉 Félicitations" + bouton magic link → activation compte |
| `refusee` | Message courtois et professionnel |
