-- =========================================================
-- TRAINING COMMENTS + MENTIONS (Lot 4)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.training_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  module_index integer,
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  mentions uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_comments_training ON public.training_comments(training_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_comments_user ON public.training_comments(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_comments TO authenticated;
GRANT ALL ON public.training_comments TO service_role;

ALTER TABLE public.training_comments ENABLE ROW LEVEL SECURITY;

-- Helper: is the user a co-learner of this training (or HR/admin)?
CREATE OR REPLACE FUNCTION public.can_access_training(_user_id uuid, _training_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.onboarding_assigned_trainings a
    JOIN public.onboarding_processes p ON p.id = a.process_id
    WHERE a.training_id = _training_id AND p.user_id = _user_id
  )
  OR public.has_role(_user_id, 'admin'::app_role)
  OR public.has_role(_user_id, 'hr'::app_role)
  OR public.has_role(_user_id, 'gestionnaire'::app_role);
$$;

CREATE POLICY "co_learners_can_read_comments"
  ON public.training_comments FOR SELECT TO authenticated
  USING (public.can_access_training(auth.uid(), training_id));

CREATE POLICY "co_learners_can_post_comments"
  ON public.training_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_access_training(auth.uid(), training_id));

CREATE POLICY "authors_can_edit_own_comments"
  ON public.training_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authors_and_admins_can_delete"
  ON public.training_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_training_comments_updated_at
  BEFORE UPDATE ON public.training_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------
-- Mention notifications
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.training_mention_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.training_comments(id) ON DELETE CASCADE,
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  from_user_id uuid NOT NULL,
  from_name text NOT NULL,
  excerpt text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mention_notif_user ON public.training_mention_notifications(user_id, read_at, created_at DESC);

GRANT SELECT, UPDATE ON public.training_mention_notifications TO authenticated;
GRANT ALL ON public.training_mention_notifications TO service_role;

ALTER TABLE public.training_mention_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_mentions"
  ON public.training_mention_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_mark_own_mentions_read"
  ON public.training_mention_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------
-- RPC: post a comment + emit notifications for valid mentions
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_training_comment(
  _training_id uuid,
  _module_index integer,
  _body text,
  _mentions uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_name text;
  v_comment_id uuid;
  v_valid uuid[];
  v_excerpt text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.can_access_training(v_user, _training_id) THEN
    RAISE EXCEPTION 'Access denied to this training';
  END IF;
  IF _body IS NULL OR length(trim(_body)) = 0 THEN
    RAISE EXCEPTION 'Empty body';
  END IF;

  SELECT COALESCE(full_name, 'Apprenant') INTO v_name
  FROM public.profiles WHERE user_id = v_user;
  IF v_name IS NULL THEN v_name := 'Apprenant'; END IF;

  -- Keep only mentions that can access the training
  IF _mentions IS NOT NULL AND array_length(_mentions, 1) > 0 THEN
    SELECT COALESCE(array_agg(DISTINCT m), '{}')
      INTO v_valid
    FROM unnest(_mentions) AS m
    WHERE m <> v_user AND public.can_access_training(m, _training_id);
  ELSE
    v_valid := '{}';
  END IF;

  INSERT INTO public.training_comments (training_id, module_index, user_id, author_name, body, mentions)
  VALUES (_training_id, _module_index, v_user, v_name, trim(_body), v_valid)
  RETURNING id INTO v_comment_id;

  v_excerpt := left(trim(_body), 180);

  INSERT INTO public.training_mention_notifications (comment_id, training_id, user_id, from_user_id, from_name, excerpt)
  SELECT v_comment_id, _training_id, m, v_user, v_name, v_excerpt
  FROM unnest(v_valid) AS m;

  RETURN v_comment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.post_training_comment(uuid, integer, text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_training_comment(uuid, integer, text, uuid[]) TO authenticated;

-- ---------------------------------------------------------
-- RPC: list co-learners for a training (for @ autocomplete)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_training_co_learners(_training_id uuid)
RETURNS TABLE(user_id uuid, full_name text, role text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_access_training(auth.uid(), _training_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH learners AS (
    SELECT DISTINCT p.user_id, COALESCE(pr.full_name, p.candidate_name, 'Apprenant') AS full_name, 'learner'::text AS role
    FROM public.onboarding_assigned_trainings a
    JOIN public.onboarding_processes p ON p.id = a.process_id
    LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
    WHERE a.training_id = _training_id AND p.user_id IS NOT NULL
  ),
  staff AS (
    SELECT DISTINCT ur.user_id, COALESCE(pr.full_name, 'Encadrant') AS full_name,
      CASE WHEN ur.role = 'admin' THEN 'admin'
           WHEN ur.role = 'hr' THEN 'hr'
           ELSE 'staff' END AS role
    FROM public.user_roles ur
    LEFT JOIN public.profiles pr ON pr.user_id = ur.user_id
    WHERE ur.role IN ('admin'::app_role, 'hr'::app_role, 'gestionnaire'::app_role)
  )
  SELECT * FROM learners
  UNION
  SELECT * FROM staff
  ORDER BY 2;
END;
$$;

REVOKE ALL ON FUNCTION public.list_training_co_learners(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_training_co_learners(uuid) TO authenticated;

-- ---------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_mention_notifications;
ALTER TABLE public.training_comments REPLICA IDENTITY FULL;
ALTER TABLE public.training_mention_notifications REPLICA IDENTITY FULL;