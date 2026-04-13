
CREATE OR REPLACE FUNCTION public.set_project_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  next_num TEXT;
  last_number TEXT;
  letter_pair TEXT;
  seq INT;
  first_letter INT;
  second_letter INT;
BEGIN
  IF NEW.project_number IS NULL THEN
    -- Use advisory lock to prevent race conditions
    PERFORM pg_advisory_xact_lock(hashtext('generate_project_number'));

    SELECT project_number INTO last_number
    FROM public.projects
    WHERE project_number IS NOT NULL
    ORDER BY project_number DESC
    LIMIT 1;

    IF last_number IS NULL THEN
      NEW.project_number := 'CM-PA0001';
    ELSE
      letter_pair := substring(last_number FROM 4 FOR 2);
      seq := (substring(last_number FROM 6))::INT;

      IF seq < 9999 THEN
        NEW.project_number := 'CM-' || letter_pair || lpad((seq + 1)::TEXT, 4, '0');
      ELSIF ascii(substring(letter_pair FROM 2 FOR 1)) < ascii('Z') THEN
        NEW.project_number := 'CM-' || substring(letter_pair FROM 1 FOR 1) || chr(ascii(substring(letter_pair FROM 2 FOR 1)) + 1) || '0001';
      ELSE
        NEW.project_number := 'CM-' || chr(ascii(substring(letter_pair FROM 1 FOR 1)) + 1) || 'A0001';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
