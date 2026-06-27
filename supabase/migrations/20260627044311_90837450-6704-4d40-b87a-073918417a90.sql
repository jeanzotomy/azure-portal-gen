
CREATE OR REPLACE FUNCTION public.award_learner_xp(
  _event_type text,
  _xp integer,
  _training_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today_total integer;
  v_event_id uuid;
  v_xp_capped integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _event_type NOT IN ('chapter_completed','quiz_passed','quiz_perfect','certificate_earned','comment_helpful','daily_streak','training_completed') THEN
    RAISE EXCEPTION 'invalid event_type %', _event_type;
  END IF;

  v_xp_capped := LEAST(GREATEST(_xp, 1), CASE _event_type
    WHEN 'chapter_completed' THEN 20
    WHEN 'quiz_passed' THEN 50
    WHEN 'quiz_perfect' THEN 100
    WHEN 'certificate_earned' THEN 200
    WHEN 'comment_helpful' THEN 10
    WHEN 'daily_streak' THEN 30
    WHEN 'training_completed' THEN 150
    ELSE 10
  END);

  SELECT COALESCE(SUM(xp),0) INTO v_today_total
  FROM public.learner_xp_events
  WHERE user_id = v_uid AND created_at::date = CURRENT_DATE;

  IF v_today_total >= 500 THEN RETURN NULL; END IF;
  v_xp_capped := LEAST(v_xp_capped, 500 - v_today_total);

  IF _event_type = 'daily_streak' THEN
    IF EXISTS (SELECT 1 FROM public.learner_xp_events
               WHERE user_id = v_uid AND event_type='daily_streak'
                 AND created_at::date = CURRENT_DATE) THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.learner_xp_events (user_id, event_type, xp, training_id, metadata)
  VALUES (v_uid, _event_type, v_xp_capped, _training_id, _metadata)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.award_learner_xp(text,integer,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_learner_xp(text,integer,uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_learner_leaderboard(_limit integer DEFAULT 20)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  total_xp bigint,
  rank bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH agg AS (
    SELECT e.user_id, SUM(e.xp)::bigint AS total_xp
    FROM public.learner_xp_events e
    WHERE e.created_at >= date_trunc('week', now())
    GROUP BY e.user_id
  )
  SELECT
    a.user_id,
    COALESCE(NULLIF(TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')),''), p.full_name, 'Apprenant') AS full_name,
    NULL::text AS avatar_url,
    a.total_xp,
    ROW_NUMBER() OVER (ORDER BY a.total_xp DESC) AS rank
  FROM agg a
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  ORDER BY a.total_xp DESC
  LIMIT GREATEST(_limit, 1);
$$;

REVOKE ALL ON FUNCTION public.get_learner_leaderboard(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_learner_leaderboard(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_learner_rank()
RETURNS TABLE (
  total_xp_week bigint,
  total_xp_alltime bigint,
  rank_week bigint,
  league text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_week bigint;
  v_alltime bigint;
  v_rank bigint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT COALESCE(SUM(xp),0) INTO v_week
  FROM public.learner_xp_events
  WHERE user_id = v_uid AND created_at >= date_trunc('week', now());

  SELECT COALESCE(SUM(xp),0) INTO v_alltime
  FROM public.learner_xp_events
  WHERE user_id = v_uid;

  WITH ranked AS (
    SELECT user_id, SUM(xp) AS s FROM public.learner_xp_events
    WHERE created_at >= date_trunc('week', now()) GROUP BY user_id
  ),
  ordered AS (SELECT user_id, ROW_NUMBER() OVER (ORDER BY s DESC) AS r FROM ranked)
  SELECT r INTO v_rank FROM ordered WHERE user_id = v_uid;

  RETURN QUERY SELECT v_week, v_alltime, COALESCE(v_rank,0),
    CASE
      WHEN v_alltime >= 5000 THEN 'platine'
      WHEN v_alltime >= 2000 THEN 'or'
      WHEN v_alltime >= 500 THEN 'argent'
      ELSE 'bronze'
    END;
END;
$$;

REVOKE ALL ON FUNCTION public.get_learner_rank() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_learner_rank() TO authenticated;

CREATE OR REPLACE FUNCTION public.toggle_learner_follow(_followee uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_exists boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF v_uid = _followee THEN RAISE EXCEPTION 'cannot follow self'; END IF;

  SELECT EXISTS (SELECT 1 FROM public.learner_follows
                 WHERE follower_id = v_uid AND followee_id = _followee) INTO v_exists;
  IF v_exists THEN
    DELETE FROM public.learner_follows
    WHERE follower_id = v_uid AND followee_id = _followee;
    RETURN false;
  ELSE
    INSERT INTO public.learner_follows (follower_id, followee_id)
    VALUES (v_uid, _followee);
    RETURN true;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_learner_follow(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_learner_follow(uuid) TO authenticated;
