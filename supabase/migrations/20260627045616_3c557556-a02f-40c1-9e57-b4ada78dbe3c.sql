-- Mark a training comment as official answer (staff or training author only)
CREATE OR REPLACE FUNCTION public.mark_training_comment_official(_comment_id uuid, _is_official boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_training uuid;
  v_author uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT c.training_id, t.created_by
    INTO v_training, v_author
  FROM public.training_comments c
  JOIN public.trainings t ON t.id = c.training_id
  WHERE c.id = _comment_id;

  IF v_training IS NULL THEN RAISE EXCEPTION 'comment not found'; END IF;

  IF NOT (
    public.has_role(v_uid, 'admin'::app_role)
    OR public.has_role(v_uid, 'hr'::app_role)
    OR public.has_role(v_uid, 'gestionnaire'::app_role)
    OR v_uid = v_author
  ) THEN
    RAISE EXCEPTION 'Only staff or the training author can mark an official answer';
  END IF;

  UPDATE public.training_comments
  SET is_official_answer = _is_official
  WHERE id = _comment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_training_comment_official(uuid, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_training_comment_official(uuid, boolean) TO authenticated;