ALTER TABLE public.service_invoice_items
ADD COLUMN IF NOT EXISTS discount_rate NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.service_invoices
ADD COLUMN IF NOT EXISTS early_payment_discount_rate NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS early_payment_discount_amount NUMERIC NOT NULL DEFAULT 0;