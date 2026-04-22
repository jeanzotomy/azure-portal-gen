CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.slugify_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT
    trim(both '-' FROM
      regexp_replace(
        regexp_replace(
          lower(
            translate(
              extensions.unaccent(coalesce(input, '')),
              '''`’',
              ''
            )
          ),
          '[^a-z0-9]+', '-', 'g'
        ),
        '-+', '-', 'g'
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.get_job_by_slug(_slug text)
RETURNS SETOF public.job_postings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.job_postings
  WHERE status = 'publiee'
    AND substring(public.slugify_text(title), 1, 80) = _slug
  ORDER BY created_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.slugify_text(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_job_by_slug(text) TO anon, authenticated;