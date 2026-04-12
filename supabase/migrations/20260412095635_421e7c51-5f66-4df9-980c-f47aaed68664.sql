
CREATE TABLE public.sms_otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login',
  user_id UUID,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes')
);

ALTER TABLE public.sms_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage OTP codes"
ON public.sms_otp_codes
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_sms_otp_phone_used ON public.sms_otp_codes (phone, used);
