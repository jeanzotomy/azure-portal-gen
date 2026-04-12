
-- Create invoice type enum
CREATE TYPE public.invoice_type AS ENUM ('facture', 'recu');
CREATE TYPE public.invoice_status AS ENUM ('en_attente', 'validee', 'non_conforme');

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  invoice_number TEXT,
  vendor TEXT,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  invoice_date DATE,
  due_date DATE,
  type invoice_type NOT NULL DEFAULT 'facture',
  status invoice_status NOT NULL DEFAULT 'en_attente',
  file_name TEXT,
  sharepoint_url TEXT,
  parsed_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add numeric budget tracking to projects
ALTER TABLE public.projects
  ADD COLUMN total_budget NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN total_paid NUMERIC(12,2) DEFAULT 0;

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage all invoices"
ON public.invoices FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Comptables full access
CREATE POLICY "Comptables can manage all invoices"
ON public.invoices FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'comptable'))
WITH CHECK (public.has_role(auth.uid(), 'comptable'));

-- Clients can view invoices on their own projects
CREATE POLICY "Clients can view own project invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = invoices.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to recalculate project total_paid
CREATE OR REPLACE FUNCTION public.recalculate_project_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the project for the affected invoice
  IF TG_OP = 'DELETE' THEN
    UPDATE public.projects
    SET total_paid = COALESCE((
      SELECT SUM(total_amount) FROM public.invoices
      WHERE project_id = OLD.project_id AND status = 'validee'
    ), 0)
    WHERE id = OLD.project_id;
    RETURN OLD;
  ELSE
    UPDATE public.projects
    SET total_paid = COALESCE((
      SELECT SUM(total_amount) FROM public.invoices
      WHERE project_id = NEW.project_id AND status = 'validee'
    ), 0)
    WHERE id = NEW.project_id;
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger to auto-update total_paid on invoice changes
CREATE TRIGGER recalculate_paid_on_invoice_change
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_project_paid();
