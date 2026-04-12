
CREATE TRIGGER trg_recalculate_project_paid
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_project_paid();
