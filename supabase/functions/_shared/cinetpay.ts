// Shared helpers for CinetPay integration
// Docs: https://docs.cinetpay.com/api/1.0-fr/checkout/initialisation

import { createClient } from "npm:@supabase/supabase-js@2";

export const CINETPAY_API_BASE = "https://api-checkout.cinetpay.com/v2";

export type CinetPayCurrency = "GNF" | "XOF" | "XAF" | "CDF" | "USD" | "EUR";

export interface CinetPayCredentials {
  apiKey: string;
  siteId: string;
  secretKey: string;
  enabled: boolean;
  environment: "sandbox" | "live";
}

// Loads creds from DB (payment_provider_settings) with env fallback.
// Returns null if disabled or incomplete.
export async function loadCinetPayCreds(): Promise<CinetPayCredentials | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let apiKey = Deno.env.get("CINETPAY_API_KEY") || "";
  let siteId = Deno.env.get("CINETPAY_SITE_ID") || "";
  let secretKey = Deno.env.get("CINETPAY_SECRET_KEY") || "";
  let enabled = false;
  let environment: "sandbox" | "live" = "sandbox";

  if (url && key) {
    try {
      const sb = createClient(url, key);
      const { data } = await sb
        .from("payment_provider_settings")
        .select("enabled, environment, config")
        .eq("provider", "cinetpay")
        .maybeSingle();
      if (data) {
        enabled = !!data.enabled;
        environment = (data.environment === "live" ? "live" : "sandbox");
        const cfg = (data.config ?? {}) as Record<string, string>;
        apiKey = cfg.api_key || apiKey;
        siteId = cfg.site_id || siteId;
        secretKey = cfg.secret_key || secretKey;
      }
    } catch (_) { /* ignore - fall back to env */ }
  }

  if (!apiKey || !siteId || !secretKey) return null;
  return { apiKey, siteId, secretKey, enabled, environment };
}

// Back-compat sync helper (env-only). Prefer loadCinetPayCreds().
export function getCinetPayCreds(): CinetPayCredentials | null {
  const apiKey = Deno.env.get("CINETPAY_API_KEY");
  const siteId = Deno.env.get("CINETPAY_SITE_ID");
  const secretKey = Deno.env.get("CINETPAY_SECRET_KEY");
  if (!apiKey || !siteId || !secretKey) return null;
  return { apiKey, siteId, secretKey, enabled: true, environment: "sandbox" };
}

// CinetPay requires CFA/GNF/CDF amounts to be multiples of 5.
export function normalizeAmount(amount: number, currency: CinetPayCurrency): number {
  if (currency === "USD" || currency === "EUR") return Math.round(amount);
  return Math.round(amount / 5) * 5;
}

export interface InitPaymentInput {
  transactionId: string;
  amount: number;
  currency: CinetPayCurrency;
  description: string;
  notifyUrl: string;
  returnUrl: string;
  customer: {
    id?: string;
    name: string;
    surname?: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    state?: string;
    zipCode?: string;
  };
  channels?: "ALL" | "MOBILE_MONEY" | "CREDIT_CARD" | "WALLET";
  metadata?: string;
}

export async function initPayment(creds: CinetPayCredentials, input: InitPaymentInput) {
  const body = {
    apikey: creds.apiKey,
    site_id: creds.siteId,
    transaction_id: input.transactionId,
    amount: input.amount,
    currency: input.currency,
    description: input.description.slice(0, 240),
    notify_url: input.notifyUrl,
    return_url: input.returnUrl,
    channels: input.channels ?? "ALL",
    metadata: input.metadata ?? "",
    customer_id: input.customer.id ?? input.transactionId,
    customer_name: input.customer.name?.slice(0, 64) || "Client",
    customer_surname: input.customer.surname?.slice(0, 64) || "CloudMature",
    customer_email: input.customer.email,
    customer_phone_number: input.customer.phone || "+224000000000",
    customer_address: input.customer.address || "N/A",
    customer_city: input.customer.city || "Conakry",
    customer_country: input.customer.country || "GN",
    customer_state: input.customer.state || "CK",
    customer_zip_code: input.customer.zipCode || "00000",
  };

  const res = await fetch(`${CINETPAY_API_BASE}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export async function checkPayment(creds: CinetPayCredentials, transactionId: string) {
  const res = await fetch(`${CINETPAY_API_BASE}/payment/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: creds.apiKey,
      site_id: creds.siteId,
      transaction_id: transactionId,
    }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export async function verifyIpnSignature(
  secretKey: string,
  body: Record<string, unknown>,
  receivedToken: string,
): Promise<boolean> {
  const fields = [
    "cpm_site_id","cpm_trans_id","cpm_trans_date","cpm_amount","cpm_currency",
    "signature","payment_method","cel_phone_num","cpm_phone_prefixe","cpm_language",
    "cpm_version","cpm_payment_config","cpm_page_action","cpm_custom","cpm_designation",
    "cpm_error_message",
  ];
  const data = fields.map((f) => (body[f] ?? "")).join("");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.toLowerCase() === (receivedToken || "").toLowerCase();
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
