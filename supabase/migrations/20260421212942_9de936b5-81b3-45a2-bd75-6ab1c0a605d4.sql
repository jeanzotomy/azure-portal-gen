-- Add user_id link to service_clients (nullable: existing clients may have no portal user)
ALTER TABLE public.service_clients
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS idx_service_clients_user_id ON public.service_clients(user_id);

-- Prevent two clients linked to the same user
CREATE UNIQUE INDEX IF NOT EXISTS uniq_service_clients_user_id
  ON public.service_clients(user_id)
  WHERE user_id IS NOT NULL;

-- Allow agents to manage service clients (admin/comptable/gestionnaire already covered)
DROP POLICY IF EXISTS "Agents can manage service clients" ON public.service_clients;
CREATE POLICY "Agents can manage service clients"
ON public.service_clients
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'agent'::app_role))
WITH CHECK (has_role(auth.uid(), 'agent'::app_role));

-- Allow the linked portal user to view their own service_client record
DROP POLICY IF EXISTS "Linked user can view own service_client" ON public.service_clients;
CREATE POLICY "Linked user can view own service_client"
ON public.service_clients
FOR SELECT
TO authenticated
USING (user_id = auth.uid());