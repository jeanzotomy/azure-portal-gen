# Plan de livraison — Lots 1 (fin) → 2 → 3

La demande couvre 3 lots fonctionnels lourds. Je vais livrer en **3 itérations distinctes** (1 itération = 1 message agent) pour rester ciblé, testable, et éviter une mégamigration ingérable.

## Itération A — Fin du Lot 1 (Formations)

### A1. Edge function `training-learning-path` (IA adaptative)
- `supabase/functions/training-learning-path/index.ts` (Lovable AI, `google/gemini-3-flash-preview`, `verify_jwt = false` + validation JWT en code).
- Entrée : `{ trainingId }`. Lit côté serveur (service role) : modules, scores du quiz, temps passé, `learner_progress_state`.
- Sortie : `{ nextModuleId, recommendedLevel: "revision"|"standard"|"avance", rationale }`. Met à jour `learner_progress_state.adaptive_level`.
- Pas de secret supplémentaire (LOVABLE_API_KEY déjà présent).

### A2. Wiring XP automatique dans le player
- `EmployeeTrainingPlayerPage.tsx` : appel `awardLearnerXp("chapter_completed", chapterId)` à la fin d'un chapitre, `awardLearnerXp("quiz_passed", quizId, score)` quand quiz ≥ seuil, anti-double via clé `(user_id, event_key)` déjà gérée par RPC.
- Toast "XP +N" discret + badge level-up.
- Bouton "Reprendre intelligemment" qui invoke `training-learning-path` et navigue vers `nextModuleId`.

### A3. Social learning UI
- `LearnerFollowButton.tsx` (toggle follow/unfollow via RPC `toggle_learner_follow`), affiché dans `LeaderboardPage` (à côté de chaque entrée) et dans le hero du joueur.
- `TrainingComments.tsx` : ajout d'un sélecteur `Commentaire / Question` (set `is_question=true`), badge "Question" + bouton "Marquer comme réponse officielle" (visible pour Admin/HR/auteur formation, set `is_official_answer=true`), threading via `parent_comment_id` (réponses indentées 1 niveau).

## Itération B — Lot 2 (Portail client)

### B1. Notifications enrichies
- Migration : `user_notifications` (id, user_id, type, title, body, link, meta jsonb, read_at, created_at), `profiles.notification_prefs jsonb`.
- `/portal/notifications` (liste, filtre lu/non-lu, marquer tout lu), realtime sur `user_notifications` (déjà sur la publication), badge dans `NotificationBell`.
- Edge function `send-weekly-digest` (planifiée côté Lovable scheduler) qui agrège tickets, factures, formations.

### B2. Assistant IA personnel
- Migration : `portal_assistant_messages` (id, user_id, role, content, created_at).
- Edge function `portal-assistant` (Lovable AI streaming, `gemini-3-flash-preview`), reçoit historique, contexte utilisateur (factures impayées, tickets ouverts, formations en cours via RPC dédiée).
- `PortalAssistantDrawer.tsx` (bouton flottant dans `PortalPage`, conversation persistée).

### B3. Dashboard prédictif
- `PortalDashboardSmart.tsx` : KPIs (factures à payer, tickets en cours, formations à terminer, prochain certificat), alertes proactives (échéance < 7j, ticket SLA dépassé), mini-graphe Recharts "engagement formations 30j".
- Intégré en tête de `PortalPage` (au-dessus de l'onglet courant).

### B4. Self-service avancé
- Migration : `kb_articles` (id, title, body, tags[], lang, search_tsv, published_at).
- `/portal/aide` (recherche full-text), création ticket enrichie (catégorie auto-suggérée via IA si le titre est rempli), affichage SLA.

## Itération C — Lot 3 (Paramètres + responsive)

### C1. Paramètres admin
- Migration : `admin_audit_log` (action, actor_id, target, payload jsonb, created_at), trigger générique sur tables sensibles.
- `AdminSettingsTab.tsx` enrichi : préférences (thème, langue par défaut), notifications, journal d'audit (table avec recherche/filtre), gestion d'équipe (réinvitation, suspendre).

### C2. Préférences utilisateur portail
- `/portal/parametres` : `notification_prefs` (email/push toggle par catégorie), langue, fuseau (relie au profile.timezone), avatar.

### C3. Responsive complet
- Audit + correctifs ciblés sur : `AdminPage`, `HrPortalPage`, `PortalPage`, `EmployeeTrainingPlayerPage`, `CareersPage`, dialogs RH, forms candidature.
- Breakpoints : sm/md (mobile), lg (tablette), 2xl/3xl (desktop large, container max 1600px).
- PWA renforcée : ajout `share_target` au manifest, splash screens iOS, page `/install` enrichie (déjà existante — à compléter).

## Détails techniques transverses
- Toutes les nouvelles tables `public.*` : `GRANT` explicites + RLS `auth.uid()` ou `has_role`.
- Toutes les edge functions : validation Zod, CORS, gestion `429/402` Lovable AI.
- Aucune dépendance lourde ajoutée (Recharts déjà installé).
- i18n : clés FR/EN ajoutées dans `src/i18n/fr.ts` et `en.ts`.
- Realtime : publication `supabase_realtime` étendue à `user_notifications` uniquement.

## Ordre de livraison
1. **Maintenant** : Itération A (Lot 1 final).
2. Message suivant : Itération B (portail).
3. Message d'après : Itération C (paramètres + responsive).

Je commence par l'**Itération A** dès validation.
