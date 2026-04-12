
CREATE TRIGGER recalculate_project_paid_on_invoice
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_project_paid();
