/**
 * Canonical public address of the site.
 *
 * The public site is served by Azure Static Web Apps on
 * https://www.cloudmature.com — this is the only host that may ever appear
 * in shared links, e-mails, WhatsApp messages, QR codes, documents or
 * metadata. Preview/editor hosts must never leak out of the application.
 */
export const PUBLIC_SITE_URL = "https://www.cloudmature.com";

/**
 * Origin to use when building an externally visible URL.
 *
 * When the app really runs on the production domain (apex or www) we keep the
 * actual origin so both stay consistent. Anywhere else (editor preview,
 * editor/preview hosts, localhost, *.azurestaticapps.net) we fall back to the
 * canonical address, so a link copied from the editor still points to
 * cloudmature.com.
 */
export function publicOrigin(): string {
  if (typeof window === "undefined") return PUBLIC_SITE_URL;
  const host = window.location.hostname.toLowerCase();
  if (host === "cloudmature.com" || host.endsWith(".cloudmature.com")) {
    return window.location.origin;
  }
  return PUBLIC_SITE_URL;
}

/** Builds an absolute public URL from a path (leading slash optional). */
export function publicUrl(path = "/"): string {
  const origin = publicOrigin().replace(/\/+$/, "");
  if (!path) return origin;
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}/${path.replace(/^\/+/, "")}`;
}
