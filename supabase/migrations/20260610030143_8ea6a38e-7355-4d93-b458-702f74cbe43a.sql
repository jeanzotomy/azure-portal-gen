
CREATE TABLE IF NOT EXISTS public.payment_provider_settings (
  provider TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','live')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_provider_settings TO authenticated;
GRANT ALL ON public.payment_provider_settings TO service_role;

ALTER TABLE public.payment_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read provider settings"
  ON public.payment_provider_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- writes go through service_role via edge function (no client write policy)

INSERT INTO public.payment_provider_settings (provider, enabled, environment, config)
VALUES ('cinetpay', false, 'sandbox', '{}'::jsonb)
ON CONFLICT (provider) DO NOTHING;
