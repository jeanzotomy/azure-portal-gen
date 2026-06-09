// Public certificate verification with anti-bruteforce and neutral responses.
// - Strict input format check (returns neutral failure on malformed input)
// - Per-IP sliding-window throttle (10 attempts / 60s, 60 / 10min)
// - Constant minimum response time to limit timing oracles
// - Never reveals whether a code "exists" — only "valid" or "invalid"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CODE_RE = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
const MIN_LATENCY_MS = 600; // constant-time floor
const WINDOW_SHORT_S = 60;
const WINDOW_SHORT_MAX = 10;
const WINDOW_LONG_S = 600;
const WINDOW_LONG_MAX = 60;

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  return first || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
}

function neutral(payload: Record<string, unknown>, startedAt: number) {
  const elapsed = Date.now() - startedAt;
  const wait = Math.max(0, MIN_LATENCY_MS - elapsed);
  return new Promise<Response>((resolve) => {
    setTimeout(() => {
      resolve(new Response(JSON.stringify(payload), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
      }));
    }, wait);
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const startedAt = Date.now();

  if (req.method !== "POST") {
    return neutral({ valid: false }, startedAt);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ip = clientIp(req);

  // Parse body defensively
  let code = "";
  try {
    const body = await req.json();
    code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  } catch {
    // ignore — treated as invalid below
  }

  // Throttle BEFORE doing any DB lookup
  try {
    const sinceShort = new Date(Date.now() - WINDOW_SHORT_S * 1000).toISOString();
    const sinceLong = new Date(Date.now() - WINDOW_LONG_S * 1000).toISOString();
    const [{ count: shortCount }, { count: longCount }] = await Promise.all([
      admin.from("verify_attempts").select("id", { count: "exact", head: true })
        .eq("ip", ip).gte("attempted_at", sinceShort),
      admin.from("verify_attempts").select("id", { count: "exact", head: true })
        .eq("ip", ip).gte("attempted_at", sinceLong),
    ]);
    if ((shortCount ?? 0) >= WINDOW_SHORT_MAX || (longCount ?? 0) >= WINDOW_LONG_MAX) {
      // Log the rejected attempt but keep response neutral
      await admin.from("verify_attempts").insert({ ip, code: null, ok: false });
      return neutral({ valid: false }, startedAt);
    }
  } catch (_e) {
    // If throttle log fails, fail closed with neutral response
    return neutral({ valid: false }, startedAt);
  }

  // Always record the attempt (without storing the code if malformed)
  const wellFormed = CODE_RE.test(code);

  if (!wellFormed) {
    await admin.from("verify_attempts").insert({ ip, code: null, ok: false });
    return neutral({ valid: false }, startedAt);
  }

  const { data: cert } = await admin
    .from("training_certificates")
    .select("verification_code, candidate_name, training_title, score, issued_at, expires_at, revoked_at")
    .eq("verification_code", code)
    .maybeSingle();

  const now = Date.now();
  const active = !!cert
    && !cert.revoked_at
    && (!cert.expires_at || new Date(cert.expires_at).getTime() > now);

  await admin.from("verify_attempts").insert({ ip, code, ok: active });

  if (!active || !cert) {
    return neutral({ valid: false }, startedAt);
  }

  return neutral({
    valid: true,
    certificate: {
      verification_code: cert.verification_code,
      candidate_name: cert.candidate_name,
      training_title: cert.training_title,
      score: cert.score,
      issued_at: cert.issued_at,
      expires_at: cert.expires_at,
    },
  }, startedAt);
});
