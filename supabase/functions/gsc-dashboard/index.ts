// Google Search Console dashboard proxy
// actions: live | snapshot | history
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE = "https://cloudmature.com/";
const SITE_ENC = encodeURIComponent(SITE);
const GW = "https://connector-gateway.lovable.dev/google_search_console";

function gwHeaders() {
  const lov = Deno.env.get("LOVABLE_API_KEY");
  const gsc = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lov) throw new Error("LOVABLE_API_KEY missing");
  if (!gsc) throw new Error("GOOGLE_SEARCH_CONSOLE_API_KEY missing");
  return { Authorization: `Bearer ${lov}`, "X-Connection-Api-Key": gsc, "Content-Type": "application/json" };
}

async function gscQuery(body: unknown) {
  const r = await fetch(`${GW}/webmasters/v3/sites/${SITE_ENC}/searchAnalytics/query`, {
    method: "POST",
    headers: gwHeaders(),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`GSC query failed [${r.status}]: ${await r.text()}`);
  return await r.json();
}

async function listSitemaps() {
  const r = await fetch(`${GW}/webmasters/v3/sites/${SITE_ENC}/sitemaps`, { headers: gwHeaders() });
  if (!r.ok) return { sitemap: [] };
  return await r.json();
}

async function fetchLive() {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  const start = new Date(today.getTime() - 28 * 86400_000).toISOString().slice(0, 10);

  const [totals, byDate, topQueries, topPages, sitemaps] = await Promise.all([
    gscQuery({ startDate: start, endDate: end, dimensions: [] }).catch(() => ({ rows: [] })),
    gscQuery({ startDate: start, endDate: end, dimensions: ["date"] }).catch(() => ({ rows: [] })),
    gscQuery({ startDate: start, endDate: end, dimensions: ["query"], rowLimit: 10 }).catch(() => ({ rows: [] })),
    gscQuery({ startDate: start, endDate: end, dimensions: ["page"], rowLimit: 10 }).catch(() => ({ rows: [] })),
    listSitemaps().catch(() => ({ sitemap: [] })),
  ]);

  const t = (totals.rows && totals.rows[0]) || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  const sitemap = (sitemaps.sitemap || []).find((s: any) => s.path?.includes("sitemap.xml")) || sitemaps.sitemap?.[0] || null;
  const sitemap_warnings = sitemap?.warnings ? Number(sitemap.warnings) : 0;
  const sitemap_errors = sitemap?.errors ? Number(sitemap.errors) : 0;
  const indexed_count = sitemap?.contents?.reduce((acc: number, c: any) => acc + Number(c.submitted || 0), 0) || 0;

  return {
    range: { start, end },
    totals: { clicks: t.clicks || 0, impressions: t.impressions || 0, ctr: t.ctr || 0, position: t.position || 0 },
    series: (byDate.rows || []).map((r: any) => ({
      date: r.keys[0],
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    })),
    topQueries: (topQueries.rows || []).map((r: any) => ({
      query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
    })),
    topPages: (topPages.rows || []).map((r: any) => ({
      page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
    })),
    sitemap: sitemap ? {
      path: sitemap.path,
      lastSubmitted: sitemap.lastSubmitted,
      lastDownloaded: sitemap.lastDownloaded,
      isPending: sitemap.isPending,
      warnings: sitemap_warnings,
      errors: sitemap_errors,
      indexed: indexed_count,
    } : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const auth = req.headers.get("Authorization");
    let isCron = false;
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = auth.slice(7);
    if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      isCron = true;
    } else {
      const { data: u } = await supabase.auth.getUser(token);
      if (!u?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      if (!roles?.some((r) => r.role === "admin")) {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }


    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = (body?.action as string) || (isCron ? "snapshot" : "live");

    if (action === "history") {
      const limit = Math.min(Number(body?.limit ?? 30), 90);
      const { data, error } = await supabase
        .from("seo_snapshots")
        .select("id, captured_at, clicks, impressions, ctr, position, indexed_count, errors_count, sitemap_warnings")
        .order("captured_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return new Response(JSON.stringify({ snapshots: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const live = await fetchLive();

    if (action === "snapshot" || isCron) {
      await supabase.from("seo_snapshots").insert({
        clicks: Math.round(live.totals.clicks),
        impressions: Math.round(live.totals.impressions),
        ctr: live.totals.ctr,
        position: live.totals.position,
        indexed_count: live.sitemap?.indexed ?? 0,
        errors_count: live.sitemap?.errors ?? 0,
        sitemap_warnings: live.sitemap?.warnings ?? 0,
        metrics: live as any,
      });
    }

    // attach previous snapshot for comparison
    const { data: prev } = await supabase
      .from("seo_snapshots")
      .select("captured_at, clicks, impressions, ctr, position, indexed_count, errors_count")
      .order("captured_at", { ascending: false })
      .limit(2);

    return new Response(JSON.stringify({ live, previous: prev?.[1] ?? prev?.[0] ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("gsc-dashboard error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
