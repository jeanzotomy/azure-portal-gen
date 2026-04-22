// Public edge function — serves OpenGraph HTML for job postings
// so social networks (LinkedIn, Facebook, WhatsApp, X) can read the
// correct title/description when sharing /careers/:id links.
//
// It detects social bots and returns a tiny HTML with the right meta tags.
// Real users are redirected straight to the SPA route /careers/:id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const SITE_URL = "https://cloudmature.com";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_REGEX =
  /(facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|TelegramBot|WhatsApp|Discordbot|Pinterest|redditbot|Applebot|Googlebot|bingbot|embedly|quora link preview|Snapchat|vkShare|W3C_Validator|XING|outbrain|nuzzel|tumblr|bitlybot|skypeuripreview|nuzzel|ia_archiver)/i;

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function buildHtml(opts: {
  title: string;
  description: string;
  url: string;
  image: string;
}) {
  const { title, description, url, image } = opts;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(url);
  const i = escapeHtml(image);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>${t}</title>
<meta name="description" content="${d}" />
<link rel="canonical" href="${u}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:url" content="${u}" />
<meta property="og:image" content="${i}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="640" />
<meta property="og:site_name" content="CloudMature" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${i}" />
<meta http-equiv="refresh" content="0; url=${u}" />
</head>
<body>
<h1>${t}</h1>
<p>${d}</p>
<p><a href="${u}">Voir l'offre</a></p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  // Accept ?id=<uuid>, ?slug=<title> (or legacy <title-uuid>),
  // or path suffix /job-share/<slug-or-uuid>
  const idParam = url.searchParams.get("id");
  const slugParam = url.searchParams.get("slug");
  const pathRaw = url.pathname.split("/").filter(Boolean).pop() || "";
  const pathCandidate = pathRaw && pathRaw !== "job-share" ? pathRaw : "";

  const UUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  const fromUuid = (s: string | null) => {
    if (!s) return null;
    const m = s.match(UUID_RE);
    return m ? m[1] : null;
  };
  const id = idParam || fromUuid(slugParam) || fromUuid(pathCandidate);
  // Title-only slug candidate (no embedded UUID)
  const titleSlug = !id ? (slugParam || pathCandidate || "") : "";

  const slugify = (t: string) =>
    (t || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/['’`]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

  let targetUrl = `${SITE_URL}/careers`;
  const ua = req.headers.get("user-agent") || "";
  const isBot = BOT_REGEX.test(ua);

  let title = "Offres d'emploi | CloudMature";
  let description =
    "Découvrez les offres d'emploi de CloudMature — Cloud, DevOps et IA à Conakry, Guinée.";

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    let job: any = null;

    if (id) {
      const { data } = await supabase
        .from("job_postings")
        .select("id, title, contract_type, location, description")
        .eq("id", id)
        .eq("status", "publiee")
        .maybeSingle();
      job = data;
    } else if (titleSlug) {
      const { data } = await supabase.rpc("get_job_by_slug", { _slug: titleSlug });
      job = Array.isArray(data) ? data[0] : data;
    }

    if (job) {
      const slug = slugify(job.title);
      targetUrl = `${SITE_URL}/careers/${slug || job.id}`;
      title = `${job.title} — ${job.contract_type} · ${job.location} | CloudMature`;
      const cleaned = (job.description || "").replace(/\s+/g, " ").trim();
      description = cleaned
        ? cleaned.slice(0, 200) + (cleaned.length > 200 ? "…" : "")
        : `Offre d'emploi chez CloudMature : ${job.title} (${job.contract_type}) — ${job.location}.`;
    } else if (id) {
      targetUrl = `${SITE_URL}/careers/${id}`;
    } else if (titleSlug) {
      targetUrl = `${SITE_URL}/careers/${titleSlug}`;
    }
  } catch (e) {
    console.error("job-share error", e);
    if (id) targetUrl = `${SITE_URL}/careers/${id}`;
    else if (titleSlug) targetUrl = `${SITE_URL}/careers/${titleSlug}`;
  }

  // Real users → redirect to the SPA page (now with slug)
  if (!isBot) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: targetUrl },
    });
  }

  const html = buildHtml({
    title,
    description,
    url: targetUrl,
    image: DEFAULT_IMAGE,
  });

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});
