
CREATE TABLE public.assistant_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_hash text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  question_count integer NOT NULL DEFAULT 0,
  last_question_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visitor_hash, day)
);

CREATE INDEX idx_assistant_usage_day ON public.assistant_usage(day);

GRANT ALL ON public.assistant_usage TO service_role;

ALTER TABLE public.assistant_usage ENABLE ROW LEVEL SECURITY;

-- Explicit deny for anon and authenticated (defense in depth)
CREATE POLICY "Deny client access to assistant_usage"
  ON public.assistant_usage
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
