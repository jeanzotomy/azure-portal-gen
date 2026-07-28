ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_title text;

CREATE OR REPLACE FUNCTION public.update_own_signature_title(_title text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _title IS NOT NULL AND length(trim(_title)) > 120 THEN
    RAISE EXCEPTION 'Title too long';
  END IF;
  UPDATE public.profiles
     SET signature_title = NULLIF(trim(_title), ''), updated_at = now()
   WHERE user_id = auth.uid();
END;
$$;