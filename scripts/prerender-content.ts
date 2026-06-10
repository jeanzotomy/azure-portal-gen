// PRÉ-RENDU STATIQUE (sans navigateur headless).
// S'exécute en `postbuild`. Lit dist/index.html (la coquille SPA buildée, avec
// les assets hashés) et, pour chaque page marketing, écrit dist/<slug>/index.html
// avec <title>/meta/canonical/OG corrects + JSON-LD + contenu visible.
//
// Pourquoi ainsi : Azure Static Web Apps sert les fichiers physiques avant le
// fallback SPA → ces pages sont indexables sans exécuter le JS. React reprend
// la main au chargement (createRoot remplace #root). Source de contenu UNIQUE :
// src/content/marketing-pages.ts (partagée avec le rendu React).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { MARKETING_PAGES, BASE_URL, type MarketingPage } from "../src/content/marketing-pages";

const DIST = resolve("dist");
const TEMPLATE_PATH = resolve(DIST, "index.html");

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Remplace l'attribut `attr` de la 1re balise contenant `marker`.
function replaceAttr(html: string, marker: string, attr: string, value: string): string {
  const re = new RegExp(`(<[^>]*${marker}[^>]*\\b${attr}=")[^"]*(")`, "i");
  return re.test(html) ? html.replace(re, `$1${esc(value)}$2`) : html;
}

function buildContentHtml(page: MarketingPage): string {
  const sections = page.sections
    .map((s) => {
      const paras = s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("\n");
      const bullets = s.bullets
        ? `<ul>${s.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`
        : "";
      return `<section><h2>${esc(s.h2)}</h2>${paras}${bullets}</section>`;
    })
    .join("\n");

  const related =
    page.related && page.related.length
      ? `<nav aria-label="Liens connexes"><h2>À découvrir aussi</h2><ul>${page.related
          .map((slug) => {
            const r = MARKETING_PAGES.find((p) => p.slug === slug);
            return r ? `<li><a href="/${slug}">${esc(r.h1)}</a></li>` : "";
          })
          .join("")}</ul></nav>`
      : "";

  // Contenu placé dans #root : visible pour les crawlers sans JS,
  // remplacé par l'app React au chargement.
  return (
    `<main style="max-width:768px;margin:0 auto;padding:96px 16px 48px;">` +
    `<nav aria-label="Fil d'Ariane"><a href="/">Accueil</a> / ` +
    (page.slug.startsWith("services/") ? `<a href="/services">Services</a> / ` : "") +
    `${esc(page.h1)}</nav>` +
    `<h1>${esc(page.h1)}</h1>` +
    `<p>${esc(page.intro)}</p>` +
    sections +
    related +
    `</main>`
  );
}

function jsonLd(page: MarketingPage): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.h1,
    description: page.description,
    provider: { "@type": "Organization", name: "CloudMature", url: `${BASE_URL}/` },
    areaServed: ["GN", "SN", "CI", "ML", "BF", "TG", "BJ", "NE"],
    url: `${BASE_URL}/${page.slug}`,
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function renderPage(template: string, page: MarketingPage): string {
  const url = `${BASE_URL}/${page.slug}`;
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(page.title)}</title>`);
  html = replaceAttr(html, 'name="description"', "content", page.description);
  html = replaceAttr(html, 'rel="canonical"', "href", url);
  html = replaceAttr(html, 'property="og:title"', "content", page.title);
  html = replaceAttr(html, 'name="twitter:title"', "content", page.title);
  html = replaceAttr(html, 'property="og:description"', "content", page.description);
  html = replaceAttr(html, 'name="twitter:description"', "content", page.description);
  html = replaceAttr(html, 'property="og:url"', "content", url);

  // JSON-LD spécifique à la page (avant </head>)
  html = html.replace(/<\/head>/i, `${jsonLd(page)}\n</head>`);

  // Contenu visible injecté dans #root
  html = html.replace(/<div id="root">\s*<\/div>/i, `<div id="root">${buildContentHtml(page)}</div>`);

  return html;
}

function main(): void {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`[prerender] dist/index.html introuvable — lancer 'vite build' d'abord.`);
    process.exit(1);
  }
  const template = readFileSync(TEMPLATE_PATH, "utf8");
  let count = 0;
  for (const page of MARKETING_PAGES) {
    const outPath = resolve(DIST, page.slug, "index.html");
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, renderPage(template, page));
    count++;
  }
  console.log(`[prerender] ${count} pages pré-rendues dans dist/.`);
}

main();
