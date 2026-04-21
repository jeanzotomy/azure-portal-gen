ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS default_unit TEXT NOT NULL DEFAULT 'unité';

ALTER TABLE public.service_invoice_items
ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'unité';