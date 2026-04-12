
-- Drop duplicate triggers
DROP TRIGGER IF EXISTS recalculate_paid_on_invoice_change ON public.invoices;
DROP TRIGGER IF EXISTS recalculate_project_paid_on_invoice ON public.invoices;
DROP TRIGGER IF EXISTS trg_recalculate_project_paid ON public.invoices;

-- Update function to use 'amount' (Montant HT) instead of 'total_amount'
CREATE OR REPLACE FUNCTION public.recalculate_project_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.project_id IS NOT NULL THEN
      UPDATE public.projects
      SET total_paid = COALESCE((
        SELECT SUM(amount) FROM public.invoices
        WHERE project_id = OLD.project_id AND status = 'validee'
      ), 0)
      WHERE id = OLD.project_id;
    END IF;
    RETURN OLD;
  ELSE
    -- Recalculate for NEW project
    IF NEW.project_id IS NOT NULL THEN
      UPDATE public.projects
      SET total_paid = COALESCE((
        SELECT SUM(amount) FROM public.invoices
        WHERE project_id = NEW.project_id AND status = 'validee'
      ), 0)
      WHERE id = NEW.project_id;
    END IF;
    -- If project changed, recalculate old project too
    IF TG_OP = 'UPDATE' AND OLD.project_id IS DISTINCT FROM NEW.project_id AND OLD.project_id IS NOT NULL THEN
      UPDATE public.projects
      SET total_paid = COALESCE((
        SELECT SUM(amount) FROM public.invoices
        WHERE project_id = OLD.project_id AND status = 'validee'
      ), 0)
      WHERE id = OLD.project_id;
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- Recreate single trigger
CREATE TRIGGER trg_recalculate_project_paid
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_project_paid();
