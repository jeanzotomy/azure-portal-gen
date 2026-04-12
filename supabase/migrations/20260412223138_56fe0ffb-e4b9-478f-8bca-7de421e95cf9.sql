CREATE OR REPLACE FUNCTION public.update_own_profile(
  _full_name text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _company text DEFAULT NULL,
  _location text DEFAULT NULL,
  _timezone text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET
    full_name = COALESCE(_full_name, full_name),
    phone = COALESCE(_phone, phone),
    company = COALESCE(_company, company),
    location = COALESCE(_location, location),
    timezone = COALESCE(_timezone, timezone),
    updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;