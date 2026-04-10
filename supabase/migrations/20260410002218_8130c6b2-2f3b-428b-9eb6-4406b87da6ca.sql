
-- Add project_number column
ALTER TABLE public.projects ADD COLUMN project_number TEXT UNIQUE;

-- Function to generate next project number
CREATE OR REPLACE FUNCTION public.generate_project_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  last_number TEXT;
  letter_pair TEXT;
  seq INT;
  first_letter INT;
  second_letter INT;
BEGIN
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

  -- Increment letter pair: PA->PB->...->PZ->QA->...
  first_letter := ascii(substring(letter_pair FROM 1 FOR 1));
  second_letter := ascii(substring(letter_pair FROM 2 FOR 1));

  IF second_letter < ascii('Z') THEN
    RETURN 'CM-' || chr(first_letter) || chr(second_letter + 1) || '0001';
  ELSE
    RETURN 'CM-' || chr(first_letter + 1) || 'A' || '0001';
  END IF;
END;
$$;

-- Trigger function
CREATE OR REPLACE FUNCTION public.set_project_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.project_number IS NULL THEN
    NEW.project_number := generate_project_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger
CREATE TRIGGER trg_set_project_number
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_project_number();

-- Backfill existing projects
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.projects WHERE project_number IS NULL ORDER BY created_at ASC
  LOOP
    UPDATE public.projects SET project_number = public.generate_project_number() WHERE id = r.id;
  END LOOP;
END;
$$;
