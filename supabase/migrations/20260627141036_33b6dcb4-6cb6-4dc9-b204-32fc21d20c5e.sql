
-- 1) Recherche côté serveur + pagination pour l'autocomplétion @mention.
--    Compatible avec l'appel existant (params optionnels).
CREATE OR REPLACE FUNCTION public.list_training_co_learners(
  _training_id uuid,
  _query text DEFAULT NULL,
  _limit int DEFAULT 30
)
RETURNS TABLE(user_id uuid, full_name text, role text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean;
  v_q text;
  v_lim int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  IF NOT public.can_access_training(v_uid, _training_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_is_staff := public.has_role(v_uid, 'admin'::app_role)
             OR public.has_role(v_uid, 'hr'::app_role)
             OR public.has_role(v_uid, 'gestionnaire'::app_role);

  v_q := LOWER(NULLIF(TRIM(COALESCE(_query, '')), ''));
  v_lim := GREATEST(1, LEAST(COALESCE(_limit, 30), 50));

  RETURN QUERY
  WITH
    my_groups AS (
      SELECT DISTINCT m.group_id
      FROM public.training_group_members m
      JOIN public.onboarding_processes p ON p.id = m.process_id
      JOIN public.training_group_assignments ga ON ga.group_id = m.group_id
      WHERE p.user_id = v_uid AND ga.training_id = _training_id
    ),
    learners AS (
      SELECT DISTINCT
        p.user_id,
        COALESCE(
          NULLIF(
            TRIM(
              split_part(COALESCE(pr.full_name, p.candidate_name, 'Apprenant'), ' ', 1)
              || ' '
              || COALESCE(NULLIF(LEFT(split_part(COALESCE(pr.full_name, p.candidate_name, ''), ' ', 2), 1), ''), '')
              || CASE WHEN split_part(COALESCE(pr.full_name, p.candidate_name, ''), ' ', 2) <> '' THEN '.' ELSE '' END
            ),
            ''
          ),
          'Apprenant'
        ) AS full_name,
        'learner'::text AS role
      FROM public.onboarding_assigned_trainings a
      JOIN public.onboarding_processes p ON p.id = a.process_id
      LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
      WHERE a.training_id = _training_id
        AND p.user_id IS NOT NULL
        AND p.user_id <> v_uid
        AND (
          v_is_staff
          OR EXISTS (
            SELECT 1
            FROM public.training_group_members m2
            WHERE m2.process_id = p.id
              AND m2.group_id IN (SELECT group_id FROM my_groups)
          )
        )
    ),
    instructors AS (
      SELECT DISTINCT
        t.created_by AS user_id,
        COALESCE(pr.full_name, 'Formateur') AS full_name,
        'instructor'::text AS role
      FROM public.trainings t
      LEFT JOIN public.profiles pr ON pr.user_id = t.created_by
      WHERE t.id = _training_id
        AND t.created_by IS NOT NULL
        AND t.created_by <> v_uid
    ),
    pool AS (
      SELECT * FROM instructors
      UNION
      SELECT * FROM learners
    )
  SELECT pool.user_id, pool.full_name, pool.role
  FROM pool
  WHERE v_q IS NULL OR LOWER(pool.full_name) LIKE '%' || v_q || '%'
  ORDER BY pool.role, pool.full_name
  LIMIT v_lim;
END;
$function$;

-- 2) Audit des tentatives de mention hors périmètre : on journalise les user_id
--    fournis mais filtrés par can_access_training (potentielle énumération).
CREATE OR REPLACE FUNCTION public.post_training_comment(
  _training_id uuid, _module_index integer, _body text, _mentions uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_name text;
  v_comment_id uuid;
  v_valid uuid[];
  v_rejected uuid[];
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

  IF _mentions IS NOT NULL AND array_length(_mentions, 1) > 0 THEN
    SELECT
      COALESCE(array_agg(DISTINCT m) FILTER (WHERE m <> v_user AND public.can_access_training(m, _training_id)), '{}'),
      COALESCE(array_agg(DISTINCT m) FILTER (WHERE m <> v_user AND NOT public.can_access_training(m, _training_id)), '{}')
      INTO v_valid, v_rejected
    FROM unnest(_mentions) AS m;
  ELSE
    v_valid := '{}';
    v_rejected := '{}';
  END IF;

  -- Audit : tentative de mention hors périmètre formation (énumération potentielle)
  IF array_length(v_rejected, 1) > 0 THEN
    INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, payload)
    VALUES (
      v_user,
      'training.mention.rejected',
      'training',
      _training_id::text,
      jsonb_build_object('rejected_user_ids', v_rejected, 'count', array_length(v_rejected, 1))
    );
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
$function$;
