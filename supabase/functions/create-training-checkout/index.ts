import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolveOrCreateCustomer } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const user = userData.user;

    const { trainingId, currency: reqCurrency, returnUrl, environment } = await req.json();
    if (!trainingId || (environment !== "sandbox" && environment !== "live") || !returnUrl) {
      return new Response(JSON.stringify({ error: "Invalid params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: training, error: tErr } = await sb
      .from("trainings")
      .select("id, title, description, price_cents, currency, active")
      .eq("id", trainingId)
      .maybeSingle();
    if (tErr || !training) return new Response(JSON.stringify({ error: "Training not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!training.active) return new Response(JSON.stringify({ error: "Training not available" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const amountCents = Number(training.price_cents || 0);
    if (!amountCents || amountCents < 50) {
      return new Response(JSON.stringify({ error: "Training has no purchasable price" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const currency = String(reqCurrency || training.currency || "cad").toLowerCase();

    const env: StripeEnv = environment;
    const stripe = createStripeClient(env);
    const customerId = await resolveOrCreateCustomer(stripe, { email: user.email, userId: user.id });

    const productName = `Formation : ${training.title}`;
    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name: productName,
            ...(training.description ? { description: String(training.description).slice(0, 500) } : {}),
            tax_code: "txcd_10101000",
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      customer: customerId,
      payment_intent_data: { description: productName },
      managed_payments: { enabled: true },
      metadata: {
        userId: user.id,
        training_id: training.id,
        priceId: `training_${training.id}`,
        kind: "training",
      },
    } as any);

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("create-training-checkout error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
