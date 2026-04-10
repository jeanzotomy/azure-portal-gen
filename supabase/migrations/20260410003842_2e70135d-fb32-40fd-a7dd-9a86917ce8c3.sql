
CREATE OR REPLACE FUNCTION public.generate_project_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  last_number TEXT;
  letter_pair TEXT;
  seq INT;
  first_letter INT;
  second_letter INT;
BEGIN
  -- Advisory lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('generate_project_number'));

  SELECT project_number INTO last_number
  FROM public.projects
  WHERE project_number IS NOT NULL
  ORDER BY project_number DESC
  LIMIT 1;

  IF last_number IS NULL THEN
    RETURN 'CM-PA0001';
  END IF;

  letter_pair := substring(last_number FROM 4 FOR 2);
  seq := (substring(last_number FROM 6))::INT;

  IF seq < 9999 THEN
    RETURN 'CM-' || letter_pair || lpad((seq + 1)::TEXT, 4, '0');
  END IF;

  first_letter := ascii(substring(letter_pair FROM 1 FOR 1));
  second_letter := ascii(substring(letter_pair FROM 2 FOR 1));

  IF second_letter < ascii('Z') THEN
    RETURN 'CM-' || chr(first_letter) || chr(second_letter + 1) || '0001';
  ELSE
    RETURN 'CM-' || chr(first_letter + 1) || 'A' || '0001';
  END IF;
END;
$function$;

-- Same fix for ticket numbers
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  last_seq INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('generate_ticket_number'));

  SELECT COALESCE(MAX((substring(ticket_number FROM 7))::INT), 0) INTO last_seq
  FROM public.support_tickets
  WHERE ticket_number IS NOT NULL;

  RETURN 'CM-INC' || lpad((last_seq + 1)::TEXT, 6, '0');
END;
$function$;
