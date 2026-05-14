CREATE TABLE public.seo_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  site_url TEXT NOT NULL DEFAULT 'https://cloudmature.com/',
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(8,5) NOT NULL DEFAULT 0,
  position NUMERIC(8,3) NOT NULL DEFAULT 0,
  indexed_count INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  sitemap_warnings INTEGER NOT NULL DEFAULT 0,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_snapshots_captured_at ON public.seo_snapshots (captured_at DESC);

ALTER TABLE public.seo_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view seo snapshots"
ON public.seo_snapshots FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert seo snapshots"
ON public.seo_snapshots FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete seo snapshots"
ON public.seo_snapshots FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));