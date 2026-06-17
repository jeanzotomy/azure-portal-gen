import { supabase } from "@/integrations/supabase/client";

/**
 * Stored signature values are storage paths (e.g. "<user_id>/signature.png")
 * inside the private `signatures` bucket.
 *
 * For backward compatibility, this helper also accepts legacy public URLs
 * (which no longer resolve since the bucket was switched to private) and
 * extracts their underlying path so a signed URL can be issued.
 */
export function extractSignaturePath(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const value = stored.split("?")[0];
  if (!value) return null;
  const m = value.match(/\/storage\/v1\/object\/(?:public|sign)\/signatures\/(.+)$/);
  if (m) return m[1];
  if (value.startsWith("http")) return null; // unknown URL - cannot resolve
  return value; // already a path
}

/**
 * Returns a fresh signed URL for a stored signature value, or `null` if the
 * value is empty / not resolvable. Signed URLs expire after `ttlSeconds`.
 */
export async function resolveSignatureUrl(
  stored: string | null | undefined,
  ttlSeconds = 3600,
): Promise<string | null> {
  const path = extractSignaturePath(stored);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("signatures")
    .createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
