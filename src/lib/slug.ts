// Utility to generate URL-friendly slugs from job titles.
// URLs are now title-only: `/careers/<slug>`. The slug is matched
// server-side via the `get_job_by_slug` Postgres function.

export function slugify(input: string): string {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Build the public URL path for a job posting (title-only).
export function jobPath(_id: string, title: string): string {
  const s = slugify(title);
  return s ? `/careers/${s}` : `/careers`;
}

// Back-compat: extract a trailing UUID from an old-style slug
// like "devops-engineer-<uuid>" or a bare UUID. Returns null otherwise.
const UUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
export function extractJobId(param: string | undefined): string | null {
  if (!param) return null;
  const m = param.match(UUID_RE);
  if (m) return m[1];
  if (/^[0-9a-f-]{30,}$/i.test(param)) return param;
  return null;
}
