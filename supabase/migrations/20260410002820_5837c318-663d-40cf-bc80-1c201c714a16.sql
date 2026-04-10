
-- Add ticket_number column
ALTER TABLE public.support_tickets ADD COLUMN ticket_number TEXT UNIQUE;

-- Function to generate next ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  last_seq INT;
BEGIN
  SELECT COALESCE(MAX((substring(ticket_number FROM 7))::INT), 0) INTO last_seq
  FROM public.support_tickets
  WHERE ticket_number IS NOT NULL;

  RETURN 'CM-INC' || lpad((last_seq + 1)::TEXT, 6, '0');
END;
$$;

-- Trigger function
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger
CREATE TRIGGER trg_set_ticket_number
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_ticket_number();

-- Backfill existing tickets
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.support_tickets WHERE ticket_number IS NULL ORDER BY created_at ASC
  LOOP
    UPDATE public.support_tickets SET ticket_number = public.generate_ticket_number() WHERE id = r.id;
  END LOOP;
END;
$$;
