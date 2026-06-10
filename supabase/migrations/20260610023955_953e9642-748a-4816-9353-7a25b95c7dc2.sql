-- 1) Table principale
CREATE TABLE public.cinetpay_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email text,
  customer_name text,
  customer_phone text,
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency IN ('GNF','XOF','XAF','CDF','USD','EUR')),
  kind text NOT NULL CHECK (kind IN ('saas_subscription','training','service_invoice','consulting_pack')),
  related_id uuid,
  related_ref text,
  description text,
  status text NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente','paye','echoue','annule','rembourse')),
  payment_method text,
  payment_operator text,
  cpm_phone_prefixe text,
  cpm_payid text,
  cinetpay_response jsonb,
  payment_url text,
  paid_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  metadata jsonb DEFAULT '{}'::jsonb,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','live')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cinetpay_user ON public.cinetpay_transactions(user_id);
CREATE INDEX idx_cinetpay_status ON public.cinetpay_transactions(status);
CREATE INDEX idx_cinetpay_kind ON public.cinetpay_transactions(kind);
CREATE INDEX idx_cinetpay_related ON public.cinetpay_transactions(related_id);

-- 2) Grants
GRANT SELECT ON public.cinetpay_transactions TO authenticated;
GRANT ALL ON public.cinetpay_transactions TO service_role;

-- 3) RLS
ALTER TABLE public.cinetpay_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own transactions"
ON public.cinetpay_transactions FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'agent'::app_role)
  OR public.has_role(auth.uid(), 'comptable'::app_role)
);

CREATE POLICY "Service role manages all"
ON public.cinetpay_transactions FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 4) updated_at trigger
CREATE TRIGGER trg_cinetpay_updated_at
BEFORE UPDATE ON public.cinetpay_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Générateur d'ID transaction CM-CP######
CREATE OR REPLACE FUNCTION public.generate_cinetpay_transaction_id()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  last_seq int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('generate_cinetpay_transaction_id'));
  SELECT COALESCE(MAX((substring(transaction_id FROM 6))::int), 0) INTO last_seq
  FROM public.cinetpay_transactions
  WHERE transaction_id LIKE 'CM-CP%';
  RETURN 'CM-CP' || lpad((last_seq + 1)::text, 6, '0');
END;
$$;

-- 6) Trigger pour auto-générer le transaction_id
CREATE OR REPLACE FUNCTION public.set_cinetpay_transaction_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.transaction_id IS NULL OR NEW.transaction_id = '' THEN
    NEW.transaction_id := public.generate_cinetpay_transaction_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_cinetpay_transaction_id
BEFORE INSERT ON public.cinetpay_transactions
FOR EACH ROW EXECUTE FUNCTION public.set_cinetpay_transaction_id();