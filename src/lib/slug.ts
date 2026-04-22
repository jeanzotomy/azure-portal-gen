// Utility to generate URL-friendly slugs from job titles.
// Format used in URLs: `/careers/<slug>-<id>`
// We keep the id at the end (separated by `-`) so the route can still
// resolve a job uniquely even if the title changes or the slug is altered.

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

// Build the public URL path for a job posting.
export function jobPath(id: string, title: string): string {
  const s = slugify(title);
  return s ? `/careers/${s}-${id}` : `/careers/${id}`;
}

// Extract the trailing UUID from a slug param like "devops-engineer-<uuid>".
// Returns the raw param if no UUID-looking suffix is found (back-compat).
const UUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
export function extractJobId(param: string | undefined): string | null {
  if (!param) return null;
  const m = param.match(UUID_RE);
  if (m) return m[1];
  // If the whole param looks like a UUID, return as-is.
  if (/^[0-9a-f-]{30,}$/i.test(param)) return param;
  return null;
}
