
DROP POLICY IF EXISTS "Anyone can submit a quote request" ON public.quote_requests;

ALTER TABLE public.quote_requests
  ADD CONSTRAINT quote_requests_full_name_len CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 120),
  ADD CONSTRAINT quote_requests_email_len CHECK (char_length(btrim(email)) BETWEEN 5 AND 255),
  ADD CONSTRAINT quote_requests_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ADD CONSTRAINT quote_requests_service_name_len CHECK (char_length(btrim(service_name)) BETWEEN 2 AND 200),
  ADD CONSTRAINT quote_requests_company_len CHECK (company IS NULL OR char_length(company) <= 200),
  ADD CONSTRAINT quote_requests_phone_len CHECK (phone IS NULL OR char_length(phone) <= 40),
  ADD CONSTRAINT quote_requests_country_len CHECK (country IS NULL OR char_length(country) <= 100),
  ADD CONSTRAINT quote_requests_message_len CHECK (message IS NULL OR char_length(message) <= 4000),
  ADD CONSTRAINT quote_requests_quantity_range CHECK (quantity IS NULL OR (quantity >= 0 AND quantity <= 1000000));

CREATE POLICY "Public can submit validated quote request"
  ON public.quote_requests
  FOR INSERT
  WITH CHECK (
    full_name IS NOT NULL AND char_length(btrim(full_name)) BETWEEN 2 AND 120
    AND email IS NOT NULL AND char_length(btrim(email)) BETWEEN 5 AND 255
      AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND service_name IS NOT NULL AND char_length(btrim(service_name)) BETWEEN 2 AND 200
    AND (message IS NULL OR char_length(message) <= 4000)
    AND (company IS NULL OR char_length(company) <= 200)
    AND (phone IS NULL OR char_length(phone) <= 40)
    AND (country IS NULL OR char_length(country) <= 100)
    AND status = 'new'
    AND (user_id IS NULL OR user_id = auth.uid())
  );
