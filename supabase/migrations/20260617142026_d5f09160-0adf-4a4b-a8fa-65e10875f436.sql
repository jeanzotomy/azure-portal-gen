
-- Add audience to trainings: 'public' (catalog, visible to all) or 'employee' (assigned via HR)
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'employee'
  CHECK (audience IN ('public','employee'));

CREATE INDEX IF NOT EXISTS idx_trainings_audience ON public.trainings(audience);

-- Backfill: anything already published with a price OR explicitly published becomes public
UPDATE public.trainings SET audience = 'public' WHERE published = true;

-- RPC: assign a training to every registered user (admin/hr only)
CREATE OR REPLACE FUNCTION public.assign_training_to_all_users(_training_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_proc uuid;
  v_count int := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'hr'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR v_uid IN SELECT id FROM auth.users LOOP
    BEGIN
      v_proc := public.get_or_create_employee_process(v_uid);
      INSERT INTO public.onboarding_assigned_trainings (process_id, training_id, assigned_by, source)
      VALUES (v_proc, _training_id, auth.uid(), 'all_users')
      ON CONFLICT (process_id, training_id) DO NOTHING;
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;
