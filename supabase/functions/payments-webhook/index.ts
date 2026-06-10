import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _sb: ReturnType<typeof createClient> | null = null;
function sb() {
  if (!_sb) {
    _sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  }
  return _sb;
}

function periodFields(subscription: any) {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  return { priceId, productId, periodStart, periodEnd };
}

function planTierFromPriceId(priceId?: string): string | null {
  if (!priceId) return null;
  if (priceId.startsWith("saas_starter")) return "starter";
  if (priceId.startsWith("saas_pro")) return "pro";
  if (priceId.startsWith("saas_enterprise")) return "enterprise";
  return null;
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }
  const { priceId, productId, periodStart, periodEnd } = periodFields(subscription);
  const tier = planTierFromPriceId(priceId);

  await sb().from("subscriptions").upsert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    product_id: productId,
    price_id: priceId,
    status: subscription.status,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" });

  if (tier) {
    await sb().from("profiles").update({ plan_tier: tier }).eq("user_id", userId);
  }
  await sb().rpc("sync_premium_role_for_user", { _user_id: userId });

  await sb().from("webhook_events").insert({
    source: "stripe", event_type: "subscription.created", status: "processed",
    payload: { subscription_id: subscription.id, user_id: userId, env, tier },
  });
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const { priceId, productId, periodStart, periodEnd } = periodFields(subscription);
  const tier = planTierFromPriceId(priceId);
  const userId = subscription.metadata?.userId;

  await sb().from("subscriptions").update({
    status: subscription.status,
    product_id: productId,
    price_id: priceId,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    updated_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", subscription.id).eq("environment", env);

  if (userId && tier) {
    await sb().from("profiles").update({ plan_tier: tier }).eq("user_id", userId);
  }
  if (userId) await sb().rpc("sync_premium_role_for_user", { _user_id: userId });

  await sb().from("webhook_events").insert({
    source: "stripe", event_type: "subscription.updated", status: "processed",
    payload: { subscription_id: subscription.id, user_id: userId, env, tier, status: subscription.status },
  });
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await sb().from("subscriptions").update({
    status: "canceled",
    updated_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", subscription.id).eq("environment", env);

  const userId = subscription.metadata?.userId;
  if (userId) await sb().rpc("sync_premium_role_for_user", { _user_id: userId });

  await sb().from("webhook_events").insert({
    source: "stripe", event_type: "subscription.deleted", status: "processed",
    payload: { subscription_id: subscription.id, user_id: userId, env },
  });
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  // Subscriptions handled via customer.subscription.* events.
  if (session.mode !== "payment") return;

  const meta = session.metadata || {};
  const userId = meta.userId;
  const kind = meta.kind;

  if (kind === "service_invoice" && meta.invoice_id) {
    await sb().from("service_invoices").update({ status: "payee", paid_at: new Date().toISOString() }).eq("id", meta.invoice_id);
  } else if (meta.priceId?.startsWith("training_") && userId && meta.training_id) {
    // Auto-enroll the buyer into the training (one-shot purchase)
    const { data: procId } = await sb().rpc("get_or_create_employee_process", { _user_id: userId });
    if (procId) {
      await sb().from("onboarding_assigned_trainings").upsert({
        process_id: procId,
        training_id: meta.training_id,
        assigned_by: userId,
        source: "purchase",
      }, { onConflict: "process_id,training_id" });
    }
  } else if (meta.priceId?.startsWith("pack_") && userId) {
    // Create internal ticket for activation
    const productName = session.amount_total
      ? `Pack ${meta.priceId} (${(session.amount_total / 100).toFixed(2)} ${session.currency?.toUpperCase()})`
      : `Pack ${meta.priceId}`;
    await sb().from("support_tickets").insert({
      user_id: userId,
      subject: `Activation pack consulting`,
      message: `Le client a acheté : ${productName}.\nSession Stripe : ${session.id}.\nÀ activer côté équipe.`,
      status: "ouvert",
      priority: "haute",
    });
  }

  await sb().from("webhook_events").insert({
    source: "stripe", event_type: "checkout.session.completed", status: "processed",
    payload: { session_id: session.id, user_id: userId, kind: kind || meta.priceId, env, amount: session.amount_total, currency: session.currency },
  });
}

async function logFailure(eventType: string, payload: any, error: string) {
  await sb().from("webhook_events").insert({
    source: "stripe", event_type: eventType, status: "failed", error, payload,
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;

  try {
    const event = await verifyWebhook(req, env);

    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object, env); break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object, env); break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env); break;
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, env); break;
      case "invoice.payment_failed":
        await sb().from("webhook_events").insert({
          source: "stripe", event_type: event.type, status: "received",
          payload: { customer: (event.data.object as any).customer, env },
        });
        break;
      default:
        console.log("Unhandled event:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Webhook error:", e);
    try { await logFailure("unknown", { env }, e?.message || "unknown"); } catch {}
    return new Response("Webhook error", { status: 400 });
  }
});
