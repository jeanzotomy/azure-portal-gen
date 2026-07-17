
-- Revoke column-level access to the quiz JSONB so answers aren't exposed via the public REST endpoint.
REVOKE SELECT ON public.trainings FROM anon, authenticated;

GRANT SELECT (id, title, description, url, duration_minutes, category, target_job_titles, active, created_by, created_at, updated_at, departments, sectors, content, passing_score, ai_generated, topic, level, price_cents, currency, published, audience)
ON public.trainings TO anon, authenticated;

-- Ensure staff can still write (their policies use ALL and require table-level privileges).
GRANT INSERT, UPDATE, DELETE ON public.trainings TO authenticated;
GRANT ALL ON public.trainings TO service_role;
