
-- Migrate existing 'user' roles to 'client'
UPDATE public.user_roles SET role = 'client' WHERE role = 'user';

-- Auto-assign 'client' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_role();

-- Agents can view all tickets
CREATE POLICY "Agents can view all tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'agent'));

-- Agents can update tickets (status changes)
CREATE POLICY "Agents can update all tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'agent'));

-- Agents can view all ticket replies
CREATE POLICY "Agents can view all replies"
ON public.ticket_replies
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'agent'));

-- Agents can reply to any ticket
CREATE POLICY "Agents can reply to any ticket"
ON public.ticket_replies
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'agent') AND auth.uid() = user_id);

-- Agents can view profiles (to see client info on tickets)
CREATE POLICY "Agents can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'agent'));
