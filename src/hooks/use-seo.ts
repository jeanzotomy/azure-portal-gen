import { useEffect } from "react";

interface SeoOptions {
  title: string; // <60 chars
  description: string; // 50-160 chars
  path: string; // e.g. "/privacy"
}

import { PUBLIC_SITE_URL } from "@/lib/site-url";

const BASE = PUBLIC_SITE_URL;

const setMeta = (selector: string, attr: "content" | "href", value: string) => {
  let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el) {
    if (selector.startsWith("meta")) {
      el = document.createElement("meta");
      const m = selector.match(/\[(name|property)="([^"]+)"\]/);
      if (m) el.setAttribute(m[1], m[2]);
    } else if (selector.startsWith("link")) {
      el = document.createElement("link");
      const m = selector.match(/\[rel="([^"]+)"\]/);
      if (m) el.setAttribute("rel", m[1]);
    }
    if (el) document.head.appendChild(el);
  }
  if (el) (el as any)[attr] = value;
};

const DEFAULTS = {
  title: "CloudMature | Cloud · DevOps · IA - Conakry, Guinée",
  description:
    "Cloud Mature - Entreprise de technologies spécialisée en Cloud (Azure, AWS, GCP), DevOps et Intelligence Artificielle. Conakry, Guinée.",
  url: `${BASE}/`,
};

/**
 * Sets per-route <title>, <meta description>, canonical and og:* tags.
 * Restores site defaults on unmount so navigating back to other routes
 * doesn't leak stale metadata.
 */
export function useSeo({ title, description, path }: SeoOptions) {
  useEffect(() => {
    const url = `${BASE}${path}`;
    document.title = title;
    setMeta('meta[name="description"]', "content", description);
    setMeta('link[rel="canonical"]', "href", url);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:type"]', "content", "website");
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);

    return () => {
      document.title = DEFAULTS.title;
      setMeta('meta[name="description"]', "content", DEFAULTS.description);
      setMeta('link[rel="canonical"]', "href", DEFAULTS.url);
      setMeta('meta[property="og:title"]', "content", DEFAULTS.title);
      setMeta('meta[property="og:description"]', "content", DEFAULTS.description);
      setMeta('meta[property="og:url"]', "content", DEFAULTS.url);
      setMeta('meta[property="og:type"]', "content", "website");
      setMeta('meta[name="twitter:title"]', "content", DEFAULTS.title);
      setMeta('meta[name="twitter:description"]', "content", DEFAULTS.description);
    };
  }, [title, description, path]);
}
