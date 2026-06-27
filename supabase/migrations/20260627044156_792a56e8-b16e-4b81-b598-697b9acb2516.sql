
-- ============================================================
-- LEARNER PROGRESS STATE (parcours adaptatif IA)
-- ============================================================
CREATE TABLE public.learner_progress_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  current_level text NOT NULL DEFAULT 'standard' CHECK (current_level IN ('revision','standard','avance')),
  average_score numeric(5,2) DEFAULT 0,
  total_time_seconds integer DEFAULT 0,
  last_recommendation jsonb,
  last_computed_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, training_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learner_progress_state TO authenticated;
GRANT ALL ON public.learner_progress_state TO service_role;
ALTER TABLE public.learner_progress_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learner sees own progress state"
  ON public.learner_progress_state FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr') OR public.has_role(auth.uid(),'gestionnaire'));

CREATE POLICY "learner upserts own progress state"
  ON public.learner_progress_state FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "learner updates own progress state"
  ON public.learner_progress_state FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "staff manages all progress states"
  ON public.learner_progress_state FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

-- ============================================================
-- LEARNER XP EVENTS (gamification + classement)
-- ============================================================
CREATE TABLE public.learner_xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('chapter_completed','quiz_passed','quiz_perfect','certificate_earned','comment_helpful','daily_streak','training_completed')),
  xp integer NOT NULL CHECK (xp > 0 AND xp <= 1000),
  training_id uuid REFERENCES public.trainings(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_learner_xp_events_user ON public.learner_xp_events(user_id);
CREATE INDEX idx_learner_xp_events_created ON public.learner_xp_events(created_at DESC);

GRANT SELECT, INSERT ON public.learner_xp_events TO authenticated;
GRANT ALL ON public.learner_xp_events TO service_role;
ALTER TABLE public.learner_xp_events ENABLE ROW LEVEL SECURITY;

-- Tout authentifié peut lire (classement public au sein de l'app)
CREATE POLICY "authenticated reads xp events"
  ON public.learner_xp_events FOR SELECT TO authenticated USING (true);

-- Seul service_role peut insérer (via RPC/trigger) — empêche la triche
CREATE POLICY "service inserts xp events"
  ON public.learner_xp_events FOR INSERT TO service_role WITH CHECK (true);

-- ============================================================
-- LEARNER FOLLOWS (social learning)
-- ============================================================
CREATE TABLE public.learner_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

CREATE INDEX idx_learner_follows_follower ON public.learner_follows(follower_id);
CREATE INDEX idx_learner_follows_followee ON public.learner_follows(followee_id);

GRANT SELECT, INSERT, DELETE ON public.learner_follows TO authenticated;
GRANT ALL ON public.learner_follows TO service_role;
ALTER TABLE public.learner_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated reads follows"
  ON public.learner_follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "user creates own follow"
  ON public.learner_follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "user deletes own follow"
  ON public.learner_follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- ============================================================
-- TRAINING COMMENTS : extension Q&R
-- ============================================================
ALTER TABLE public.training_comments
  ADD COLUMN IF NOT EXISTS is_question boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_official_answer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES public.training_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_training_comments_parent ON public.training_comments(parent_comment_id);

-- ============================================================
-- TRIGGER update_updated_at
-- ============================================================
CREATE TRIGGER update_learner_progress_state_updated_at
  BEFORE UPDATE ON public.learner_progress_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
