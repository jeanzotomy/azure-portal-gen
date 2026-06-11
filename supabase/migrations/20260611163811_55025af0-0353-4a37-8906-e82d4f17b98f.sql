
ALTER TABLE public.service_invoice_items
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_frequency text,
  ADD COLUMN IF NOT EXISTS periods integer NOT NULL DEFAULT 1;

ALTER TABLE public.service_invoice_items
  DROP CONSTRAINT IF EXISTS service_invoice_items_billing_frequency_check;
ALTER TABLE public.service_invoice_items
  ADD CONSTRAINT service_invoice_items_billing_frequency_check
  CHECK (billing_frequency IS NULL OR billing_frequency IN ('mensuel','trimestriel','semestriel','annuel'));

ALTER TABLE public.service_invoice_items
  DROP CONSTRAINT IF EXISTS service_invoice_items_periods_check;
ALTER TABLE public.service_invoice_items
  ADD CONSTRAINT service_invoice_items_periods_check CHECK (periods >= 1);
