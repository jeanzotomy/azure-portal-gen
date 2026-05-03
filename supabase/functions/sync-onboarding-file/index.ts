import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getGraphToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.value;
  const tenantId = Deno.env.get("AZURE_TENANT_ID")!;
  const clientId = Deno.env.get("AZURE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET")!;
  const params = new URLSearchParams({
    grant_type: "client_credentials", client_id: clientId,
    client_secret: clientSecret, scope: "https://graph.microsoft.com/.default",
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString(),
  });
  if (!res.ok) throw new Error(`Azure AD token failed: ${await res.text()}`);
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

const sanitize = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "-").trim().substring(0, 80) || "anon";

async function ensureFolder(token: string, siteId: string, driveId: string, parentPath: string, folderName: string) {
  const url = parentPath
    ? `${GRAPH_BASE}/sites/${siteId}/drives/${driveId}/root:/${parentPath}:/children`
    : `${GRAPH_BASE}/sites/${siteId}/drives/${driveId}/root/children`;
  const r = await fetch(url, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: folderName, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }),
  });
  if (r.ok) return await r.json();
  if (r.status === 409) {
    const lr = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const ld = await lr.json();
    const existing = (ld.value || []).find((it: any) => it.name === folderName && it.folder);
    if (existing) return existing;
  }
  throw new Error(`folder failed [${r.status}]`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!jwt) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const processId = body.process_id as string;
    const storagePath = body.storage_path as string;
    const fileName = body.file_name as string;
    const kind = (body.kind as string) || "document"; // document | signature | contract
    if (!processId || !storagePath || !fileName) throw new Error("process_id, storage_path, file_name required");

    // Verify caller owns the process OR is staff
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    const roles = (roleRows || []).map((r) => r.role);
    const isStaff = roles.includes("admin") || roles.includes("gestionnaire") || roles.includes("hr");

    const { data: proc } = await admin.from("onboarding_processes").select("*").eq("id", processId).maybeSingle();
    if (!proc) throw new Error("Process not found");
    if (!isStaff && proc.user_id !== u.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Download from storage
    const { data: fileBlob, error: dErr } = await admin.storage.from("onboarding-files").download(storagePath);
    if (dErr || !fileBlob) throw new Error(`Storage download failed: ${dErr?.message || "no data"}`);
    const bytes = new Uint8Array(await fileBlob.arrayBuffer());
    const contentType = fileBlob.type || "application/octet-stream";

    const { data: cfg } = await admin.from("sharepoint_config").select("site_id, drive_id").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!cfg?.site_id || !cfg?.drive_id) throw new Error("SharePoint not configured");
    if (!proc.job_id) throw new Error("No job linked to process");

    const token = await getGraphToken();
    const parts = (proc.candidate_name || "").trim().split(/\s+/);
    const firstName = sanitize(parts[0] || "");
    const lastName = sanitize(parts.slice(1).join(" ") || parts[0] || "");
    const folderName = `${firstName}-${lastName}-${String(proc.job_id).substring(0, 8)}`;
    await ensureFolder(token, cfg.site_id, cfg.drive_id, "", "Candidatures");
    await ensureFolder(token, cfg.site_id, cfg.drive_id, "Candidatures", folderName);
    const subfolder = kind === "signature" ? "Signatures" : kind === "contract" ? "Contrats" : "Documents-Onboarding";
    await ensureFolder(token, cfg.site_id, cfg.drive_id, `Candidatures/${folderName}`, subfolder);

    const targetPath = `Candidatures/${folderName}/${subfolder}`;
    const safeName = fileName.replace(/[<>:"/\\|?*]/g, "_");
    const upUrl = `${GRAPH_BASE}/sites/${cfg.site_id}/drives/${cfg.drive_id}/root:/${targetPath}/${safeName}:/content`;
    const upRes = await fetch(upUrl, {
      method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType }, body: bytes,
    });
    const upData = await upRes.json();
    if (!upRes.ok) throw new Error(`SP upload [${upRes.status}]: ${JSON.stringify(upData)}`);

    return new Response(JSON.stringify({ success: true, webUrl: upData.webUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("sync-onboarding-file:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
