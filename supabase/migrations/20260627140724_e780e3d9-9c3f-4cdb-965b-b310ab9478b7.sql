
-- Durcissement sécurité : la fonction list_training_co_learners exposait
-- l'intégralité du staff (admin/hr/gestionnaire) à tout apprenant ayant accès
-- à une formation. On restreint strictement aux personnes pertinentes pour la
-- formation et on anonymise le nom (prénom + initiale du nom).

CREATE OR REPLACE FUNCTION public.list_training_co_learners(_training_id uuid)
RETURNS TABLE(user_id uuid, full_name text, role text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean;
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

  RETURN QUERY
  WITH
    -- Groupes de formation partagés par l'appelant pour CE training
    my_groups AS (
      SELECT DISTINCT m.group_id
      FROM public.training_group_members m
      JOIN public.onboarding_processes p ON p.id = m.process_id
      JOIN public.training_group_assignments ga ON ga.group_id = m.group_id
      WHERE p.user_id = v_uid
        AND ga.training_id = _training_id
    ),
    -- Co-apprenants : uniquement ceux partageant un groupe avec l'appelant.
    -- Le staff voit tous les apprenants de la formation.
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
    -- Encadrement strictement lié à la formation : créateur + formateur assigné
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
    )
  SELECT * FROM instructors
  UNION
  SELECT * FROM learners
  ORDER BY 3, 2
  LIMIT 100;
END;
$function$;

-- Le créateur (instructeur) doit pouvoir être mentionné — étend can_access_training
-- pour qu'il puisse aussi accéder à sa propre formation côté post_training_comment.
-- (Déjà couvert par les rôles admin/hr/gestionnaire pour la plupart des cas.)
