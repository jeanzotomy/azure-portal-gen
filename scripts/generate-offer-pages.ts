// S'exécute après `vite build`. Écrit une vraie page HTML par offre publiée
// dans dist/careers/<slug>/index.html.
//
// Pourquoi : le site est un site static. Sans ce script, le serveur renvoie le
// même fichier index.html pour toutes les adresses, qui porte le titre du site.
// Les robots qui fabrique les fiches de partage (WhatsApp, LinkedIn, Facebook,
// messageries, e-mails) ne lisent que ce fichier et n'exécutent pas le programme
// de la page : ils voyaient donc toujours le titre du site.
//
// Avec ce script, l'adresse de l'offre porte elle-même le titre, la description
// et les balises de partage de l'offre. Le fichier contient aussi le programme
// du site : un visiteur voit la page d'offre complète, un robot lit ses infos.
//
// Le script ne doit jamais faire échouer la construction : si la base est
// injoignable, il prévient et laisse la construction telle quelle.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, join } from "path";

const BASE_URL = "https://www.cloudmature.com";
const DIST = resolve("dist");

// --- Configuration : variables d'environnement, avec repli sur les valeurs
// déjà utilisées par scripts/generate-sitemap.ts (clé publique du backend).
function readEnvFile(name: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of readFileSync(resolve(name), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* fichier absent : ignorer */
  }
  return out;
}

const envFile = { ...readEnvFile(".env"), ...readEnvFile(".env.production") };
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  envFile.VITE_SUPABASE_URL ||
  "https://zwzazxebufydnaxezngx.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  envFile.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3emF6eGVidWZ5ZG5heGV6bmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mjc1NjMsImV4cCI6MjA5MTMwMzU2M30.wL1NrlAeer5XEIHB2LQJj0gL4O7Ou4mdpRnPDcpX3_g";

interface Offer {
  title: string;
  description: string | null;
  contract_type: string;
  location: string;
  sector: string | null;
  start_date: string | null;
  salary_range: string | null;
  closing_date: string | null;
  created_at: string;
  updated_at: string;
}

function slugify(input: string): string {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

async function fetchOffers(): Promise<Offer[]> {
  const url = `${SUPABASE_URL}/rest/v1/job_postings?select=title,description,contract_type,location,sector,start_date,salary_range,closing_date,created_at,updated_at&status=eq.publiee&order=created_at.desc`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`réponse ${res.status} de la base`);
  return (await res.json()) as Offer[];
}

// Remplace une balise existante ; ne l'invente pas si elle a disparu du gabarit.
function replaceTag(html: string, pattern: RegExp, replacement: string): string {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

const EMPLOYMENT_TYPES: Record<string, string> = {
  CDI: "FULL_TIME",
  CDD: "TEMPORARY",
  Stage: "INTERN",
  Alternance: "INTERN",
  Freelance: "CONTRACTOR",
};

function jobPostingJsonLd(o: Offer, url: string): string {
  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: o.title,
    description: o.description || `Offre d'emploi : ${o.title}`,
    datePosted: o.created_at,
    employmentType: EMPLOYMENT_TYPES[o.contract_type] || "OTHER",
    hiringOrganization: {
      "@type": "Organization",
      name: "Cloud Mature",
      sameAs: BASE_URL,
    },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: o.location },
    },
  };
  if (o.closing_date) json.validThrough = `${o.closing_date}T23:59:59+00:00`;
  // \u003c empêche une séquence </script> de fermer le bloc prématurément.
  return JSON.stringify(json).replace(/</g, "\\u003c");
}

function buildPage(gabarit: string, o: Offer): { path: string; html: string } {
  const slug = slugify(o.title);
  const url = `${BASE_URL}/careers/${slug}`;
  const title = `${o.title} - ${o.contract_type} · ${o.location} | Cloud Mature`;
  const cleaned = (o.description || "").replace(/\s+/g, " ").trim();
  const description = cleaned
    ? cleaned.slice(0, 200) + (cleaned.length > 200 ? "…" : "")
    : `Offre d'emploi chez Cloud Mature : ${o.title} (${o.contract_type}) - ${o.location}.`;

  const t = escapeHtml(title);
  const d = escapeHtml(description);

  let html = gabarit;
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${t}</title>`);
  html = replaceTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"/,
    `<meta name="description" content="${d}"`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"/,
    `<meta property="og:title" content="${t}"`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"/,
    `<meta property="og:description" content="${d}"`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"/,
    `<meta property="og:url" content="${url}"`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:type"\s+content="[^"]*"/,
    `<meta property="og:type" content="article"`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"/,
    `<meta name="twitter:title" content="${t}"`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"/,
    `<meta name="twitter:description" content="${d}"`,
  );
  html = replaceTag(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"/,
    `<link rel="canonical" href="${url}"`,
  );
  html = html.replace(
    /<\/head>/,
    `  <script type="application/ld+json">${jobPostingJsonLd(o, url)}</script>\n  </head>`,
  );

  return { path: join(DIST, "careers", slug, "index.html"), html };
}

async function main() {
  const gabaritPath = join(DIST, "index.html");
  if (!existsSync(gabaritPath)) {
    console.warn("[offres] dist/index.html absent : pages d'offres non générées.");
    return;
  }
  const gabarit = readFileSync(gabaritPath, "utf8");

  let offers: Offer[];
  try {
    offers = await fetchOffers();
  } catch (e) {
    console.warn(
      `[offres] base injoignable (${(e as Error).message}) : pages d'offres non générées.`,
    );
    return;
  }

  const seen = new Set<string>();
  let written = 0;
  for (const o of offers) {
    const slug = slugify(o.title);
    if (!slug) continue;
    if (seen.has(slug)) {
      console.warn(`[offres] titre en doublon ignoré : ${o.title}`);
      continue;
    }
    seen.add(slug);
    const { path, html } = buildPage(gabarit, o);
    mkdirSync(resolve(path, ".."), { recursive: true });
    writeFileSync(path, html);
    written++;
  }
  console.log(`[offres] ${written} page(s) d'offre(s) générée(s) dans dist/careers/`);
}

await main();
