## Objectif

Ajouter des fonctionnalités concurrentielles et innovantes sur 3 axes (Formations, Portail client, Paramètres), puis garantir un responsive complet (mobile / tablette / desktop large / PWA renforcée).

Le périmètre est large : je le livre en **3 lots** indépendants déployables l'un après l'autre. Vous validez ce plan, puis chaque lot est livré et testable avant d'enchaîner le suivant.

---

## Lot 1 — Formations : innovations pédagogiques

### 1.1 Parcours adaptatif IA renforcé
- Nouvel edge function `training-learning-path` : à partir des scores de quiz et du temps passé, recommande le prochain module/chapitre (niveau : révision, standard, avancé).
- Carte « Recommandé pour vous » sur `EmployeeTrainingsListPage` avec raison ("Tu as 62% en réseaux — révise le module X").
- Stockage du niveau courant dans une nouvelle table `learner_progress_state` (RLS scope `auth.uid()`).

### 1.2 Gamification + classements
- Extension de `candidate_gamification` (déjà présent) : ajout d'une table `learner_xp_events` (event_type, xp, training_id).
- Triggers : +XP à chaque chapitre terminé, quiz réussi, certificat obtenu, commentaire utile.
- Page `/portal/formations/classement` : Top 20 hebdo + ligue personnelle (Bronze / Argent / Or / Platine selon XP).
- Widget « Mon rang » dans `GamificationWidget` existant.

### 1.3 Social learning
- Réutilisation de `training_comments` + `training_mention_notifications` existants.
- Ajout d'un **fil d'activité cohorte** déjà ébauché (`CohortActivityFeed.tsx`) : on l'enrichit avec filtres (mes amis, ma cohorte, tous) et réactions emoji.
- Nouvelle table `learner_follows` (follower_id, followee_id) + bouton "Suivre" sur les profils apprenants.
- Q&R : un commentaire peut être marqué « question », les staff/auteurs peuvent marquer une réponse comme « réponse officielle ».

### 1.4 Certificats vérifiables + partage LinkedIn
- La page `/verify/:code` existe déjà. Ajout :
  - Bouton **« Ajouter à mon profil LinkedIn »** (URL `https://www.linkedin.com/profile/add` pré-remplie avec name, issuer, issue date, cert URL).
  - QR code téléchargeable (lib `qrcode` déjà compatible) sur le certificat PDF.
  - Lien de partage one-click vers LinkedIn / WhatsApp / X.

---

## Lot 2 — Portail client : fonctions concurrentielles

### 2.1 Centre de notifications enrichi
- Nouvelle table `user_notifications` (user_id, type, title, body, link, read_at, channel).
- Préférences par canal (email / push / in-app) dans `profiles.notification_prefs` (jsonb).
- Page `/portal/notifications` : liste filtrable, marquage lu/non-lu en masse, digest hebdo (edge function cron `send-weekly-digest`).
- Cloche existante (`NotificationBell`) branchée sur cette table avec realtime Supabase.

### 2.2 Assistant IA personnel contextuel
- Nouvel edge function `portal-assistant` (Lovable AI, modèle `google/gemini-3-flash-preview`).
- Contexte injecté : projets de l'utilisateur, factures impayées, formations en cours, tickets ouverts (requêtes server-side scope `auth.uid()`).
- Composant `PortalAssistantDrawer` accessible via bouton flottant (à côté du bouton WhatsApp) — différencié visuellement.
- Historique conversation persisté dans `portal_assistant_messages`.

### 2.3 Tableau de bord prédictif
- Nouveau composant `PortalDashboardSmart` : KPIs projets (avancement, retard prédit), factures (à venir, en retard), formations (% complétion, deadline).
- Alertes proactives : "3 factures arrivent à échéance cette semaine", "Formation X expire dans 5j".
- Graphique d'engagement (Recharts) sur 30j.

### 2.4 Self-service avancé
- Création ticket enrichie : catégorie, priorité, fichiers joints, capture d'écran.
- Affichage SLA visuel (barre de progression colorée selon priorité).
- Base de connaissances `kb_articles` (admin écrit, client lit) avec recherche full-text.

---

## Lot 3 — Paramètres app + Responsive complet

### 3.1 Paramètres admin enrichis
- Onglet **Préférences globales** (déjà partiellement) : thème par défaut, langue par défaut, fuseau, devise.
- Onglet **Notifications** : règles fines par type d'événement, templates editables.
- Onglet **Audit log** : nouvelle table `admin_audit_log`, vue paginée filtrable (acteur, action, cible, date).
- Onglet **Gestion équipe** : invitations en masse, attribution de rôles, désactivation.

### 3.2 Préférences utilisateur
- Page `/portal/parametres` : thème (clair/sombre/auto), langue, fuseau, préférences notifications, MFA, sessions actives.

### 3.3 Responsive complet
Audit + refonte sur :
- **Mobile (<768)** : tables → cards empilées, dialogs → full-screen sheets, navigation bottom déjà OK.
- **Tablette (768–1024)** : grilles 2 colonnes, sidebars repliables (RH, Admin, Portail).
- **Desktop large (>1440)** : `max-w-[1600px]` sur les pages denses (Admin, RH, Finance), augmentation des espacements.
- **PWA renforcée** : amélioration manifest (shortcuts, share_target), icônes haute déf, splash screens iOS, page `/install` enrichie. Pas de service worker offline (hors scope demandé).

Pages prioritaires pour la passe responsive : `AdminPage`, `HrPortalPage`, `PortalPage`, `EmployeeTrainingPlayerPage`, `CareersPage`, formulaires de candidature, dialogs RH.

---

## Détails techniques

- Toutes les nouvelles tables : RLS strict scopé `auth.uid()` ou rôle staff via `has_role`, GRANTs explicites (authenticated + service_role).
- Edge functions : `verify_jwt` validé en code, CORS standard, Lovable AI Gateway pour IA.
- Realtime activé sur `user_notifications` et `portal_assistant_messages`.
- Aucune dépendance lourde ajoutée ; réutilisation de `@dnd-kit`, Recharts, shadcn.
- i18n : nouvelles clés ajoutées dans `src/i18n/fr.ts` + `en.ts`.

---

## Livraison

Je propose de **commencer par le Lot 1 (Formations)** car c'est l'axe le plus innovant et différenciant. Confirmez-moi :

1. On valide ce plan global et j'enchaîne Lot 1 → 2 → 3 ?
2. Ou vous préférez réordonner / réduire un lot ?
