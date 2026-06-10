
-- Bulk assign a training to multiple users
CREATE OR REPLACE FUNCTION public.assign_employee_training_bulk(_user_ids uuid[], _training_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_count int := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'hr'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF _user_ids IS NULL OR array_length(_user_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOREACH v_uid IN ARRAY _user_ids LOOP
    PERFORM public.assign_employee_training(v_uid, _training_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Summary view of training groups (for management UI)
CREATE OR REPLACE FUNCTION public.list_training_groups_summary()
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  member_count int,
  training_count int,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'hr'::app_role)
       OR public.has_role(auth.uid(), 'gestionnaire'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.description,
    COALESCE((SELECT COUNT(*)::int FROM public.training_group_members m WHERE m.group_id = g.id), 0),
    COALESCE((SELECT COUNT(*)::int FROM public.training_group_assignments a WHERE a.group_id = g.id), 0),
    g.created_at
  FROM public.training_groups g
  ORDER BY g.created_at DESC;
END;
$$;

-- Add a user (employee) to a training group via their employee process
CREATE OR REPLACE FUNCTION public.add_user_to_training_group(_group_id uuid, _user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proc_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'hr'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_proc_id := public.get_or_create_employee_process(_user_id);

  INSERT INTO public.training_group_members (group_id, process_id, added_by)
  VALUES (_group_id, v_proc_id, auth.uid())
  ON CONFLICT (group_id, process_id) DO NOTHING;

  RETURN v_proc_id;
END;
$$;
