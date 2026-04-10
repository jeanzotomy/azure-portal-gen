
CREATE OR REPLACE FUNCTION public.set_project_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  attempts INT := 0;
BEGIN
  IF NEW.project_number IS NULL THEN
    LOOP
      attempts := attempts + 1;
      NEW.project_number := generate_project_number();
      -- Check if this number already exists
      IF NOT EXISTS (SELECT 1 FROM public.projects WHERE project_number = NEW.project_number) THEN
        EXIT;
      END IF;
      IF attempts > 100 THEN
        RAISE EXCEPTION 'Could not generate unique project number after 100 attempts';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
