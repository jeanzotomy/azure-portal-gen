-- ============ Comment reactions ============
CREATE TABLE IF NOT EXISTS public.training_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.training_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL CHECK (emoji IN ('👍','❤️','🎯','💡','🔥','👏')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_tcr_comment ON public.training_comment_reactions(comment_id);

GRANT SELECT, INSERT, DELETE ON public.training_comment_reactions TO authenticated;
GRANT ALL ON public.training_comment_reactions TO service_role;

ALTER TABLE public.training_comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "co_learners_read_reactions"
  ON public.training_comment_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.training_comments c
            WHERE c.id = comment_id AND public.can_access_training(auth.uid(), c.training_id))
  );

CREATE POLICY "users_add_own_reaction"
  ON public.training_comment_reactions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.training_comments c
                WHERE c.id = comment_id AND public.can_access_training(auth.uid(), c.training_id))
  );

CREATE POLICY "users_remove_own_reaction"
  ON public.training_comment_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.training_comment_reactions;
ALTER TABLE public.training_comment_reactions REPLICA IDENTITY FULL;

-- ============ Cohort activity feed (read-only RPC) ============
CREATE OR REPLACE FUNCTION public.get_cohort_activity(_limit integer DEFAULT 25)
RETURNS TABLE(
  kind text,
  user_id uuid,
  display_name text,
  detail text,
  emoji text,
  happened_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    -- training completions (visible to anyone who shares at least one training with the actor,
    -- and to HR/admins)
    SELECT
      'training_completed'::text AS kind,
      p.user_id,
      COALESCE(pr.full_name, p.candidate_name, 'Apprenant') AS display_name,
      t.title AS detail,
      CASE WHEN a.quiz_score = 100 THEN '💯' ELSE '🎓' END AS emoji,
      a.completed_at AS happened_at
    FROM public.onboarding_assigned_trainings a
    JOIN public.onboarding_processes p ON p.id = a.process_id
    JOIN public.trainings t ON t.id = a.training_id
    LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
    WHERE a.completed_at IS NOT NULL AND p.user_id IS NOT NULL
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'hr'::app_role)
        OR public.has_role(auth.uid(), 'gestionnaire'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.onboarding_assigned_trainings a2
          JOIN public.onboarding_processes p2 ON p2.id = a2.process_id
          WHERE p2.user_id = auth.uid() AND a2.training_id = a.training_id
        )
      )

    UNION ALL

    -- badges (visible to people sharing any training with the recipient OR staff)
    SELECT
      'badge'::text,
      b.user_id,
      COALESCE(pr.full_name, 'Apprenant'),
      b.badge_label,
      b.badge_icon,
      b.earned_at
    FROM public.candidate_badges b
    LEFT JOIN public.profiles pr ON pr.user_id = b.user_id
    WHERE
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'hr'::app_role)
      OR public.has_role(auth.uid(), 'gestionnaire'::app_role)
      OR EXISTS (
        SELECT 1
        FROM public.onboarding_assigned_trainings a1
        JOIN public.onboarding_processes p1 ON p1.id = a1.process_id AND p1.user_id = auth.uid()
        JOIN public.onboarding_assigned_trainings a2 ON a2.training_id = a1.training_id
        JOIN public.onboarding_processes p2 ON p2.id = a2.process_id AND p2.user_id = b.user_id
      )
  )
  SELECT * FROM base
  ORDER BY happened_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;

REVOKE ALL ON FUNCTION public.get_cohort_activity(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cohort_activity(integer) TO authenticated;