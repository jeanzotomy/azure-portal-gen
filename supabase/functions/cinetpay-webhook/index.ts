import { createClient } from "npm:@supabase/supabase-js@2";
import { checkPayment, corsHeaders, loadCinetPayCreds, verifyIpnSignature } from "../_shared/cinetpay.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function planTier(planId?: string): string | null {
  if (!planId) return null;
  if (planId === "saas_starter") return "starter";
  if (planId === "saas_pro") return "pro";
  if (planId === "saas_enterprise") return "enterprise";
  return null;
}

async function applyBusinessLogic(sb: ReturnType<typeof createClient>, tx: any) {
  const userId = tx.user_id as string | null;
  const meta = (tx.metadata ?? {}) as { planId?: string; interval?: string };

  if (tx.kind === "service_invoice" && tx.related_id) {
    await sb.from("service_invoices").update({
      status: "payee",
      paid_at: new Date().toISOString(),
    }).eq("id", tx.related_id);
  }

  if (tx.kind === "training" && userId && tx.related_id) {
    const { data: procId } = await sb.rpc("get_or_create_employee_process", { _user_id: userId });
    if (procId) {
      await sb.from("onboarding_assigned_trainings").upsert({
        process_id: procId,
        training_id: tx.related_id,
        assigned_by: userId,
        source: "purchase",
      }, { onConflict: "process_id,training_id" });
    }
  }

  if (tx.kind === "saas_subscription" && userId) {
    const tier = planTier(meta.planId);
    const months = meta.interval === "yearly" ? 12 : 1;
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + months);

    // CinetPay has no native recurring — we record a "manual" subscription window.
    await sb.from("subscriptions").upsert({
      user_id: userId,
      stripe_subscription_id: `cinetpay_${tx.transaction_id}`,
      stripe_customer_id: `cinetpay_${userId}`,
      product_id: meta.planId ?? null,
      price_id: `${meta.planId}_${(tx.currency as string).toLowerCase()}_${meta.interval ?? "monthly"}`,
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: true, // no auto-renew with CinetPay
      environment: tx.environment ?? "sandbox",
    }, { onConflict: "stripe_subscription_id" });

    if (tier) {
      await sb.from("profiles").update({ plan_tier: tier }).eq("user_id", userId);
    }
    await sb.rpc("sync_premium_role_for_user", { _user_id: userId });
  }

  if (tx.kind === "consulting_pack" && userId) {
    await sb.from("support_tickets").insert({
      user_id: userId,
      subject: "Activation pack consulting (CinetPay)",
      message: `Pack acheté: ${meta.planId ?? "inconnu"}\nTransaction: ${tx.transaction_id}\nMontant: ${tx.amount} ${tx.currency}`,
      status: "ouvert",
      priority: "haute",
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const creds = await loadCinetPayCreds();
    if (!creds) {
      console.error("CinetPay creds missing in webhook");
      return new Response("Service unavailable", { status: 503 });
    }

    // CinetPay sends application/x-www-form-urlencoded
    const ct = req.headers.get("content-type") || "";
    let body: Record<string, any> = {};
    if (ct.includes("application/json")) {
      body = await req.json();
    } else {
      const form = await req.formData();
      form.forEach((v, k) => { body[k] = v.toString(); });
    }

    const receivedToken = req.headers.get("x-token") || (body["x-token"] as string) || "";
    const transactionId = (body.cpm_trans_id as string) || "";

    if (!transactionId) {
      console.error("No cpm_trans_id in payload");
      return new Response("Missing transaction id", { status: 400 });
    }

    // Log raw event
    await sb.from("webhook_events").insert({
      source: "cinetpay",
      event_type: "ipn",
      status: "received",
      payload: { body, headers: { "x-token": receivedToken ? "[present]" : "[absent]" } },
    });

    // Verify signature if token is present (CinetPay sends it; defensive default)
    if (receivedToken) {
      const ok = await verifyIpnSignature(creds.secretKey, body, receivedToken);
      if (!ok) {
        console.error("Invalid HMAC signature for", transactionId);
        await sb.from("webhook_events").insert({
          source: "cinetpay", event_type: "ipn", status: "failed",
          error: "invalid_signature", payload: { transaction_id: transactionId },
        });
        return new Response("Invalid signature", { status: 401 });
      }
    }

    // Always verify status via API (defense in depth)
    const check = await checkPayment(creds, transactionId);
    const status = check.json?.data?.status; // ACCEPTED | REFUSED | PENDING
    const paymentMethod = check.json?.data?.payment_method;
    const operator = check.json?.data?.operator_id;

    const { data: tx } = await sb.from("cinetpay_transactions")
      .select("*").eq("transaction_id", transactionId).maybeSingle();

    if (!tx) {
      console.error("Transaction not found:", transactionId);
      return new Response("Transaction not found", { status: 404 });
    }

    if (status === "ACCEPTED" && tx.status !== "paye") {
      await sb.from("cinetpay_transactions").update({
        status: "paye",
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod ?? body.payment_method ?? null,
        payment_operator: operator ?? null,
        cpm_phone_prefixe: body.cpm_phone_prefixe ?? null,
        cinetpay_response: check.json,
      }).eq("id", tx.id);

      await applyBusinessLogic(sb, { ...tx, status: "paye" });
    } else if (status === "REFUSED") {
      await sb.from("cinetpay_transactions").update({
        status: "echoue", cinetpay_response: check.json,
      }).eq("id", tx.id);
    }

    await sb.from("webhook_events").insert({
      source: "cinetpay", event_type: "ipn", status: "processed",
      payload: { transaction_id: transactionId, cinetpay_status: status, kind: tx.kind },
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("cinetpay-webhook error:", e);
    return new Response("Webhook error", { status: 500 });
  }
});
