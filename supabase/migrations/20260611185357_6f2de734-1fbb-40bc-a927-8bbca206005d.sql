
-- Trainings: publication flag for public catalog
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_trainings_published ON public.trainings(published) WHERE published = true;

-- Ensure anon/authenticated can read published trainings via PostgREST
GRANT SELECT ON public.trainings TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view published trainings" ON public.trainings;
CREATE POLICY "Public can view published trainings"
ON public.trainings
FOR SELECT
TO anon, authenticated
USING (published = true AND active = true);

-- Service invoices: per-invoice user assignment
ALTER TABLE public.service_invoices
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_service_invoices_assigned_user ON public.service_invoices(assigned_user_id);

DROP POLICY IF EXISTS "Assigned user can view own invoices" ON public.service_invoices;
CREATE POLICY "Assigned user can view own invoices"
ON public.service_invoices
FOR SELECT
TO authenticated
USING (assigned_user_id = auth.uid());
