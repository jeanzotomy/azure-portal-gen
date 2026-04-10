
-- Fix 1: Profiles - prevent users from modifying blocked/deleted_at
-- Drop the overly permissive user update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a restricted update policy using a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.update_own_profile(
  _full_name text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _company text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    full_name = COALESCE(_full_name, full_name),
    phone = COALESCE(_phone, phone),
    company = COALESCE(_company, company),
    updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- Re-create user update policy that prevents changing blocked/deleted_at
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND blocked IS NOT DISTINCT FROM (SELECT p.blocked FROM public.profiles p WHERE p.user_id = auth.uid())
  AND deleted_at IS NOT DISTINCT FROM (SELECT p.deleted_at FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Fix 2: Ticket replies - prevent users from setting is_admin = true
DROP POLICY IF EXISTS "Users can reply to own tickets" ON public.ticket_replies;

CREATE POLICY "Users can reply to own tickets"
ON public.ticket_replies
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND is_admin = false
  AND EXISTS (
    SELECT 1 FROM support_tickets
    WHERE id = ticket_replies.ticket_id
      AND user_id = auth.uid()
  )
);

-- Also fix agent policy to enforce is_admin = true for agents
DROP POLICY IF EXISTS "Agents can reply to any ticket" ON public.ticket_replies;

CREATE POLICY "Agents can reply to any ticket"
ON public.ticket_replies
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role)
  AND auth.uid() = user_id
  AND is_admin = true
);

-- Also fix admin policy to enforce is_admin = true for admins
DROP POLICY IF EXISTS "Admins can reply to any ticket" ON public.ticket_replies;

CREATE POLICY "Admins can reply to any ticket"
ON public.ticket_replies
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND auth.uid() = user_id
  AND is_admin = true
);
