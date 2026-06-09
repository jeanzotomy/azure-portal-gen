
DROP POLICY IF EXISTS "Public can verify certificates" ON public.training_certificates;
REVOKE SELECT ON public.training_certificates FROM anon;

CREATE TABLE public.verify_attempts (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  code TEXT,
  ok BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verify_attempts_ip_time ON public.verify_attempts (ip, attempted_at DESC);

GRANT ALL ON public.verify_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.verify_attempts_id_seq TO service_role;

ALTER TABLE public.verify_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.verify_attempts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
