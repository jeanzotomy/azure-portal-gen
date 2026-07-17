// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://cloudmature.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const today = new Date().toISOString().slice(0, 10);

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0", lastmod: today },
  { path: "/pricing", changefreq: "weekly", priority: "0.9", lastmod: today },
  { path: "/formations", changefreq: "weekly", priority: "0.9", lastmod: today },
  { path: "/verify", changefreq: "monthly", priority: "0.7", lastmod: today },
  { path: "/careers", changefreq: "daily", priority: "0.9", lastmod: today },
  { path: "/privacy", changefreq: "yearly", priority: "0.3", lastmod: today },
  { path: "/terms", changefreq: "yearly", priority: "0.3", lastmod: today },
  { path: "/install", changefreq: "monthly", priority: "0.4", lastmod: today },
];

// Try to fetch published jobs from Supabase to include /careers/:slug entries.
async function fetchJobs(): Promise<SitemapEntry[]> {
  try {
    const url = "https://zwzazxebufydnaxezngx.supabase.co/rest/v1/job_postings?select=title,updated_at&status=eq.published";
    const anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3emF6eGVidWZ5ZG5heGV6bmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mjc1NjMsImV4cCI6MjA5MTMwMzU2M30.wL1NrlAeer5XEIHB2LQJj0gL4O7Ou4mdpRnPDcpX3_g";
    const res = await fetch(url, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });
    if (!res.ok) return [];
    const rows: Array<{ title: string; updated_at?: string }> = await res.json();
    const slugify = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        .replace(/['’`]/g, "").replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "").slice(0, 80);
    return rows
      .map((r) => ({ slug: slugify(r.title || ""), lastmod: (r.updated_at || "").slice(0, 10) || today }))
      .filter((r) => r.slug)
      .map((r) => ({ path: `/careers/${r.slug}`, changefreq: "weekly" as const, priority: "0.7", lastmod: r.lastmod }));
  } catch {
    return [];
  }
}

function generateSitemap(items: SitemapEntry[]) {
  const urls = items.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ].filter(Boolean).join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

const jobs = await fetchJobs();
const all = [...entries, ...jobs];
writeFileSync(resolve("public/sitemap.xml"), generateSitemap(all));
console.log(`sitemap.xml written (${all.length} entries)`);
