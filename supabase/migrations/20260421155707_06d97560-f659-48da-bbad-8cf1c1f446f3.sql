-- Signature dans le profil
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Bucket public pour les signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques storage : chaque utilisateur peut gérer son propre dossier (uid/...) 
DROP POLICY IF EXISTS "Signatures are publicly readable" ON storage.objects;
CREATE POLICY "Signatures are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'signatures');

DROP POLICY IF EXISTS "Users can upload own signature" ON storage.objects;
CREATE POLICY "Users can upload own signature"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own signature" ON storage.objects;
CREATE POLICY "Users can update own signature"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own signature" ON storage.objects;
CREATE POLICY "Users can delete own signature"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Type d'un mode de paiement
DO $$ BEGIN
  CREATE TYPE public.payment_method_type AS ENUM ('virement', 'mobile_money', 'especes', 'cheque', 'autre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Catalogue de modes de paiement
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  type public.payment_method_type NOT NULL DEFAULT 'virement',
  currency public.invoice_currency NOT NULL DEFAULT 'GNF',
  bank TEXT,
  iban TEXT,
  swift TEXT,
  account_holder TEXT,
  mobile_number TEXT,
  instructions TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage payment methods" ON public.payment_methods;
CREATE POLICY "Admins manage payment methods"
ON public.payment_methods FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Comptables manage payment methods" ON public.payment_methods;
CREATE POLICY "Comptables manage payment methods"
ON public.payment_methods FOR ALL TO authenticated
USING (has_role(auth.uid(), 'comptable'::app_role))
WITH CHECK (has_role(auth.uid(), 'comptable'::app_role));

DROP TRIGGER IF EXISTS payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Modes choisis sur une facture (multi-sélection)
ALTER TABLE public.service_invoices
ADD COLUMN IF NOT EXISTS payment_method_ids UUID[] NOT NULL DEFAULT '{}';