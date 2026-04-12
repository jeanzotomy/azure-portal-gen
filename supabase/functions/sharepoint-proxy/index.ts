import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

// Cache the Azure AD token in memory (edge function lifecycle)
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getGraphToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const tenantId = Deno.env.get("AZURE_TENANT_ID");
  const clientId = Deno.env.get("AZURE_CLIENT_ID");
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET");

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Azure AD credentials (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET) are not configured");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Azure AD token request failed [${res.status}]: ${err}`);
  }

  const data = await res.json();
  console.log("Azure AD token acquired, expires_in:", data.expires_in, "scopes:", data.scope);
  console.log("Token prefix:", data.access_token?.substring(0, 20));
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };
  return cachedToken.value;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Microsoft Graph token via Azure AD client credentials
    const graphToken = await getGraphToken();

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const graphHeaders: Record<string, string> = {
      Authorization: `Bearer ${graphToken}`,
    };

    let graphPath: string;
    let method = "GET";
    let body: string | undefined;

    switch (action) {
      case "list-sites": {
        // Search for SharePoint sites
        const search = url.searchParams.get("search") || "*";
        graphPath = `sites?search=${encodeURIComponent(search)}`;
        break;
      }

      case "get-site": {
        const siteId = url.searchParams.get("siteId");
        if (!siteId) throw new Error("siteId is required");
        graphPath = `sites/${siteId}`;
        break;
      }

      case "list-drives": {
        const siteId = url.searchParams.get("siteId");
        if (!siteId) throw new Error("siteId is required");
        graphPath = `sites/${siteId}/drives`;
        break;
      }

      case "list-files": {
        const siteId = url.searchParams.get("siteId");
        const driveId = url.searchParams.get("driveId");
        const folderId = url.searchParams.get("folderId");
        if (!siteId) throw new Error("siteId is required");
        if (driveId && folderId) {
          graphPath = `sites/${siteId}/drives/${driveId}/items/${folderId}/children`;
        } else if (driveId) {
          graphPath = `sites/${siteId}/drives/${driveId}/root/children`;
        } else {
          graphPath = `sites/${siteId}/drive/root/children`;
        }
        break;
      }

      case "download-file": {
        const siteId = url.searchParams.get("siteId");
        const driveId = url.searchParams.get("driveId");
        const itemId = url.searchParams.get("itemId");
        if (!siteId || !itemId) throw new Error("siteId and itemId are required");
        if (driveId) {
          graphPath = `sites/${siteId}/drives/${driveId}/items/${itemId}`;
        } else {
          graphPath = `sites/${siteId}/drive/items/${itemId}`;
        }
        // Get the download URL from item metadata
        break;
      }

      case "upload-file": {
        const siteId = url.searchParams.get("siteId");
        const driveId = url.searchParams.get("driveId");
        const filePath = url.searchParams.get("filePath");
        if (!siteId || !filePath) throw new Error("siteId and filePath are required");
        method = "PUT";
        if (driveId) {
          graphPath = `sites/${siteId}/drives/${driveId}/root:/${filePath}:/content`;
        } else {
          graphPath = `sites/${siteId}/drive/root:/${filePath}:/content`;
        }
        const fileBody = await req.arrayBuffer();
        body = undefined; // We'll handle binary separately
        
        const uploadResponse = await fetch(`${GRAPH_BASE}/${graphPath}`, {
          method: "PUT",
          headers: {
            ...graphHeaders,
            "Content-Type": req.headers.get("Content-Type") || "application/octet-stream",
          },
          body: fileBody,
        });

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(`Graph API error [${uploadResponse.status}]: ${JSON.stringify(uploadData)}`);
        }

        return new Response(JSON.stringify(uploadData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list-lists": {
        const siteId = url.searchParams.get("siteId");
        if (!siteId) throw new Error("siteId is required");
        graphPath = `sites/${siteId}/lists`;
        break;
      }

      case "list-items": {
        const siteId = url.searchParams.get("siteId");
        const listId = url.searchParams.get("listId");
        if (!siteId || !listId) throw new Error("siteId and listId are required");
        graphPath = `sites/${siteId}/lists/${listId}/items?expand=fields`;
        break;
      }

      case "create-folder": {
        const siteId = url.searchParams.get("siteId");
        const driveId = url.searchParams.get("driveId");
        const folderName = url.searchParams.get("folderName");
        const parentId = url.searchParams.get("parentId");
        if (!siteId || !folderName) throw new Error("siteId and folderName are required");
        method = "POST";
        if (driveId && parentId) {
          graphPath = `sites/${siteId}/drives/${driveId}/items/${parentId}/children`;
        } else if (driveId) {
          graphPath = `sites/${siteId}/drives/${driveId}/root/children`;
        } else {
          graphPath = `sites/${siteId}/drive/root/children`;
        }
        body = JSON.stringify({
          name: folderName,
          folder: {},
          "@microsoft.graph.conflictBehavior": "rename",
        });
        graphHeaders["Content-Type"] = "application/json";
        break;
      }

      case "ensure-project-folder": {
        // Creates a folder for a project if it doesn't exist (uses "fail" conflict to detect existing)
        const siteId = url.searchParams.get("siteId");
        const driveId = url.searchParams.get("driveId");
        const projectName = url.searchParams.get("projectName");
        const projectNumber = url.searchParams.get("projectNumber");
        if (!siteId || !projectName) throw new Error("siteId and projectName are required");
        const folderDisplayName = projectNumber ? `${projectNumber} - ${projectName}` : projectName;
        // Sanitize folder name for SharePoint
        const safeFolderName = folderDisplayName.replace(/[<>:"/\\|?*]/g, "_").substring(0, 200);
        method = "POST";
        if (driveId) {
          graphPath = `sites/${siteId}/drives/${driveId}/root/children`;
        } else {
          graphPath = `sites/${siteId}/drive/root/children`;
        }
        body = JSON.stringify({
          name: safeFolderName,
          folder: {},
          "@microsoft.graph.conflictBehavior": "fail",
        });
        graphHeaders["Content-Type"] = "application/json";
        
        // Try to create; if conflict (409), folder already exists — find it
        const ensureResponse = await fetch(`${GRAPH_BASE}/${graphPath}`, {
          method: "POST",
          headers: graphHeaders,
          body,
        });
        
        if (ensureResponse.ok) {
          const folderData = await ensureResponse.json();
          return new Response(JSON.stringify(folderData), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        if (ensureResponse.status === 409) {
          // Folder already exists, search for it
          const searchPath = driveId
            ? `sites/${siteId}/drives/${driveId}/root/children`
            : `sites/${siteId}/drive/root/children`;
          const searchRes = await fetch(`${GRAPH_BASE}/${searchPath}`, {
            method: "GET",
            headers: graphHeaders,
          });
          const searchData = await searchRes.json();
          const existing = (searchData.value || []).find((item: { name: string; folder?: unknown }) => item.name === safeFolderName && item.folder);
          if (existing) {
            return new Response(JSON.stringify(existing), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        
        const errData = await ensureResponse.json().catch(() => ({}));
        throw new Error(`Failed to ensure folder [${ensureResponse.status}]: ${JSON.stringify(errData)}`);
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action", availableActions: [
          "list-sites", "get-site", "list-drives", "list-files", "download-file",
          "upload-file", "list-lists", "list-items", "create-folder", "ensure-project-folder"
        ]}), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const response = await fetch(`${GRAPH_BASE}/${graphPath}`, {
      method,
      headers: graphHeaders,
      body,
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Graph API failed:", response.status, "URL:", `${GRAPH_BASE}/${graphPath}`, "Response:", JSON.stringify(data));
      throw new Error(`Graph API error [${response.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("SharePoint proxy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
