import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, CINETPAY_API_BASE } from "../_shared/cinetpay.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function mask(v?: string | null) {
  if (!v) return null;
  if (v.length <= 6) return "•".repeat(v.length);
  return v.slice(0, 3) + "•".repeat(Math.max(4, v.length - 6)) + v.slice(-3);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await sb.auth.getUser(token);
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = (body.action ?? "read") as "read" | "save" | "test";

    if (action === "read") {
      const { data } = await sb
        .from("payment_provider_settings")
        .select("enabled, environment, config, updated_at, updated_by")
        .eq("provider", "cinetpay")
        .maybeSingle();
      const cfg = (data?.config ?? {}) as Record<string, string>;
      const notifyUrl = `${SUPABASE_URL}/functions/v1/cinetpay-webhook`;
      const returnUrl = `${cfg.return_url_base || "https://www.cloudmature.com"}/checkout/return?provider=cinetpay`;
      return new Response(JSON.stringify({
        enabled: !!data?.enabled,
        environment: data?.environment ?? "sandbox",
        api_key_mask: mask(cfg.api_key),
        site_id: cfg.site_id ?? null,
        secret_key_mask: mask(cfg.secret_key),
        has_api_key: !!cfg.api_key,
        has_site_id: !!cfg.site_id,
        has_secret_key: !!cfg.secret_key,
        notify_url: notifyUrl,
        return_url: returnUrl,
        updated_at: data?.updated_at ?? null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "save") {
      const { enabled, environment, api_key, site_id, secret_key } = body as {
        enabled?: boolean;
        environment?: "sandbox" | "live";
        api_key?: string;
        site_id?: string;
        secret_key?: string;
      };
      const { data: current } = await sb
        .from("payment_provider_settings")
        .select("config")
        .eq("provider", "cinetpay")
        .maybeSingle();
      const cfg = { ...((current?.config ?? {}) as Record<string, string>) };
      if (typeof api_key === "string" && api_key.trim()) cfg.api_key = api_key.trim();
      if (typeof site_id === "string" && site_id.trim()) cfg.site_id = site_id.trim();
      if (typeof secret_key === "string" && secret_key.trim()) cfg.secret_key = secret_key.trim();

      const patch: Record<string, unknown> = {
        provider: "cinetpay",
        config: cfg,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };
      if (typeof enabled === "boolean") patch.enabled = enabled;
      if (environment === "sandbox" || environment === "live") patch.environment = environment;

      // Block enabling without complete creds
      if (patch.enabled === true && (!cfg.api_key || !cfg.site_id || !cfg.secret_key)) {
        return new Response(JSON.stringify({ error: "Renseignez API Key, Site ID et Secret Key avant d'activer." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await sb.from("payment_provider_settings").upsert(patch, { onConflict: "provider" });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "test") {
      const { data } = await sb
        .from("payment_provider_settings")
        .select("config")
        .eq("provider", "cinetpay")
        .maybeSingle();
      const cfg = (data?.config ?? {}) as Record<string, string>;
      if (!cfg.api_key || !cfg.site_id) {
        return new Response(JSON.stringify({ ok: false, error: "Clés manquantes" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // CinetPay does not expose a ping endpoint; we call /payment/check with a dummy id.
      // A valid response (even MINIMAL/NOT_FOUND with code 662 or similar) confirms creds are accepted.
      const res = await fetch(`${CINETPAY_API_BASE}/payment/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: cfg.api_key,
          site_id: cfg.site_id,
          transaction_id: "CM-CP-PING-" + Date.now(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      // CinetPay returns code "404" / "627" when transaction is unknown but creds are valid.
      // Invalid creds → "AUTH_NOT_FOUND" or HTTP 401.
      const codeStr = String(json?.code ?? "");
      const validCreds = res.status === 200 && codeStr !== "AUTH_NOT_FOUND";
      return new Response(JSON.stringify({
        ok: validCreds,
        status: res.status,
        cinetpay_code: json?.code,
        message: json?.message,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
