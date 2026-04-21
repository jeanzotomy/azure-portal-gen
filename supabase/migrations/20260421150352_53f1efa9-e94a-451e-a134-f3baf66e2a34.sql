-- =====================================================
-- SYSTÈME DE FACTURATION CLIENTS
-- =====================================================

-- 1) Enum pour le statut des factures clients
CREATE TYPE public.service_invoice_status AS ENUM (
  'brouillon',
  'emise',
  'payee',
  'en_retard',
  'annulee'
);

-- 2) Enum pour les devises
CREATE TYPE public.invoice_currency AS ENUM ('GNF', 'USD', 'EUR');

-- =====================================================
-- TABLE: service_clients (clients facturables)
-- =====================================================
CREATE TABLE public.service_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  contact_person TEXT,
  nif TEXT,
  rccm TEXT,
  address_line TEXT,
  city TEXT,
  country TEXT DEFAULT 'Guinée',
  phone TEXT,
  email TEXT,
  notes TEXT,
  sharepoint_folder_id TEXT,
  sharepoint_folder_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage service clients"
  ON public.service_clients FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Comptables can manage service clients"
  ON public.service_clients FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'comptable'::app_role))
  WITH CHECK (has_role(auth.uid(), 'comptable'::app_role));

CREATE TRIGGER update_service_clients_updated_at
  BEFORE UPDATE ON public.service_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_service_clients_name ON public.service_clients(client_name);

-- =====================================================
-- TABLE: service_catalog (services réutilisables)
-- =====================================================
CREATE TABLE public.service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  default_unit_price NUMERIC NOT NULL DEFAULT 0,
  default_currency public.invoice_currency NOT NULL DEFAULT 'GNF',
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage service catalog"
  ON public.service_catalog FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Comptables can manage service catalog"
  ON public.service_catalog FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'comptable'::app_role))
  WITH CHECK (has_role(auth.uid(), 'comptable'::app_role));

CREATE TRIGGER update_service_catalog_updated_at
  BEFORE UPDATE ON public.service_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- TABLE: service_invoices (factures clients)
-- =====================================================
CREATE TABLE public.service_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE,
  client_id UUID NOT NULL REFERENCES public.service_clients(id) ON DELETE RESTRICT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  currency public.invoice_currency NOT NULL DEFAULT 'GNF',
  payment_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_rate NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 18,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status public.service_invoice_status NOT NULL DEFAULT 'brouillon',
  sharepoint_url TEXT,
  sharepoint_pdf_id TEXT,
  sharepoint_docx_id TEXT,
  pdf_generated_at TIMESTAMPTZ,
  docx_generated_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage service invoices"
  ON public.service_invoices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Comptables can manage service invoices"
  ON public.service_invoices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'comptable'::app_role))
  WITH CHECK (has_role(auth.uid(), 'comptable'::app_role));

CREATE TRIGGER update_service_invoices_updated_at
  BEFORE UPDATE ON public.service_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_service_invoices_client ON public.service_invoices(client_id);
CREATE INDEX idx_service_invoices_status ON public.service_invoices(status);
CREATE INDEX idx_service_invoices_date ON public.service_invoices(invoice_date DESC);

-- =====================================================
-- TABLE: service_invoice_items (lignes des factures)
-- =====================================================
CREATE TABLE public.service_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.service_invoices(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  catalog_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  subtitle TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoice items"
  ON public.service_invoice_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Comptables can manage invoice items"
  ON public.service_invoice_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'comptable'::app_role))
  WITH CHECK (has_role(auth.uid(), 'comptable'::app_role));

CREATE INDEX idx_service_invoice_items_invoice ON public.service_invoice_items(invoice_id);

-- =====================================================
-- TRIGGER: numérotation auto CM-FACTXXXXX
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_service_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  last_seq INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('generate_service_invoice_number'));
  SELECT COALESCE(MAX((substring(invoice_number FROM 8))::INT), 0) INTO last_seq
  FROM public.service_invoices
  WHERE invoice_number IS NOT NULL AND invoice_number LIKE 'CM-FACT%';
  RETURN 'CM-FACT' || lpad((last_seq + 1)::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_service_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_service_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_service_invoice_number_trigger
  BEFORE INSERT ON public.service_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_service_invoice_number();

-- =====================================================
-- TRIGGER: auto-update du status "en_retard"
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_invoice_overdue()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'emise' AND NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'en_retard';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_invoice_overdue_trigger
  BEFORE INSERT OR UPDATE ON public.service_invoices
  FOR EACH ROW EXECUTE FUNCTION public.check_invoice_overdue();