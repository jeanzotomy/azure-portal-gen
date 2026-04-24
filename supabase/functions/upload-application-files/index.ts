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
  const tenantId = Deno.env.get("AZURE_TENANT_ID");
  const clientId = Deno.env.get("AZURE_CLIENT_ID");
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET");
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Azure AD credentials not configured");
  }
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Azure AD token failed: ${await res.text()}`);
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

const sanitize = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "-").trim().substring(0, 80) || "anon";

async function ensureFolder(token: string, siteId: string, driveId: string, parentPath: string, folderName: string) {
  // Try to create; if exists (409), look it up
  const createUrl = parentPath
    ? `${GRAPH_BASE}/sites/${siteId}/drives/${driveId}/root:/${parentPath}:/children`
    : `${GRAPH_BASE}/sites/${siteId}/drives/${driveId}/root/children`;

  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "fail",
    }),
  });

  if (createRes.ok) return await createRes.json();

  if (createRes.status === 409) {
    const listUrl = parentPath
      ? `${GRAPH_BASE}/sites/${siteId}/drives/${driveId}/root:/${parentPath}:/children`
      : `${GRAPH_BASE}/sites/${siteId}/drives/${driveId}/root/children`;
    const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } });
    const listData = await listRes.json();
    const existing = (listData.value || []).find((it: { name: string; folder?: unknown }) => it.name === folderName && it.folder);
    if (existing) return existing;
  }

  const err = await createRes.json().catch(() => ({}));
  throw new Error(`Failed to ensure folder "${folderName}" [${createRes.status}]: ${JSON.stringify(err)}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const contentType = req.headers.get("content-type") || "";

    // === DELETE action (JSON body) ===
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (body.action !== "delete" && body.action !== "get_or_create") {
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Require authenticated admin caller
      const authHeader = req.headers.get("Authorization") || "";
      const jwt = authHeader.replace("Bearer ", "");
      if (!jwt) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: userData, error: userErr } = await adminClient.auth.getUser(jwt);
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleRow } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) {
        return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const firstName = sanitize(String(body.firstName || ""));
      const lastName = sanitize(String(body.lastName || ""));
      const jobId = String(body.jobId || "").trim();
      if (!firstName || !lastName || !jobId) {
        return new Response(JSON.stringify({ error: "firstName, lastName, jobId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: cfg } = await adminClient
        .from("sharepoint_config")
        .select("site_id, drive_id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cfg?.site_id || !cfg?.drive_id) {
        return new Response(JSON.stringify({ error: "SharePoint not configured" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = await getGraphToken();
      const folderName = `${firstName}-${lastName}-${jobId.substring(0, 8)}`;
      const folderPath = `Candidatures/${folderName}`;
      const delUrl = `${GRAPH_BASE}/sites/${cfg.site_id}/drives/${cfg.drive_id}/root:/${folderPath}`;
      const delRes = await fetch(delUrl, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!delRes.ok && delRes.status !== 404) {
        const errText = await delRes.text();
        return new Response(JSON.stringify({ error: `Delete failed [${delRes.status}]: ${errText}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, deleted: folderName }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === UPLOAD action (multipart) ===
    const formData = await req.formData();
    const jobId = String(formData.get("jobId") || "").trim();
    const firstName = sanitize(String(formData.get("firstName") || ""));
    const lastName = sanitize(String(formData.get("lastName") || ""));
    const cv = formData.get("cv") as File | null;
    const letter = formData.get("letter") as File | null;

    if (!jobId || !firstName || !lastName) {
      return new Response(JSON.stringify({ error: "jobId, firstName, lastName required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!cv) {
      return new Response(JSON.stringify({ error: "CV file is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read SharePoint config (use service role since callers may be anonymous)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: config } = await supabase
      .from("sharepoint_config")
      .select("site_id, drive_id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!config?.site_id || !config?.drive_id) {
      return new Response(JSON.stringify({ error: "SharePoint not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getGraphToken();
    const { site_id: siteId, drive_id: driveId } = config;

    // Ensure root "Candidatures" folder
    const rootName = "Candidatures";
    await ensureFolder(token, siteId, driveId, "", rootName);

    // Ensure applicant folder: FirstName-LastName-jobId
    const applicantFolderName = `${firstName}-${lastName}-${jobId.substring(0, 8)}`;
    const applicantFolder = await ensureFolder(token, siteId, driveId, rootName, applicantFolderName);

    // Upload files into applicant folder
    const uploads: { name: string; webUrl?: string; id?: string }[] = [];
    const baseName = `${lastName}-${firstName}`;
    const folderPath = `${rootName}/${applicantFolderName}`;

    const uploadOne = async (file: File, prefix: string) => {
      const ext = file.name.split(".").pop() || "pdf";
      const fileName = `${prefix}-${baseName}-${Date.now()}.${ext}`;
      const uploadUrl = `${GRAPH_BASE}/sites/${siteId}/drives/${driveId}/root:/${folderPath}/${fileName}:/content`;
      const buffer = await file.arrayBuffer();
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: buffer,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Upload "${fileName}" failed [${res.status}]: ${JSON.stringify(data)}`);
      uploads.push({ name: fileName, webUrl: data.webUrl, id: data.id });
    };

    await uploadOne(cv, "CV");
    if (letter) await uploadOne(letter, "Lettre");

    return new Response(JSON.stringify({
      success: true,
      folder: { name: applicantFolderName, webUrl: applicantFolder.webUrl, id: applicantFolder.id },
      files: uploads,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("upload-application-files error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
