CREATE TABLE public.contact_email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  verified_at timestamptz,
  verification_token text,
  token_expires_at timestamptz,
  token_consumed_at timestamptz,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_email_otps_email_created
  ON public.contact_email_otps (lower(email), created_at DESC);

CREATE INDEX idx_contact_email_otps_token
  ON public.contact_email_otps (verification_token)
  WHERE verification_token IS NOT NULL;

GRANT ALL ON public.contact_email_otps TO service_role;

ALTER TABLE public.contact_email_otps ENABLE ROW LEVEL SECURITY;