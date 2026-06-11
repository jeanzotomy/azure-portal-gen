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

    const { invoiceId, returnUrl, environment } = await req.json();
    if (!invoiceId || (environment !== "sandbox" && environment !== "live") || !returnUrl) {
      return new Response(JSON.stringify({ error: "Invalid params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load invoice using service-role (RLS bypass) but verify ownership manually
    const { data: invoice, error: invErr } = await sb
      .from("service_invoices")
      .select("id, invoice_number, total, currency, client_id, status, assigned_user_id")
      .eq("id", invoiceId)
      .maybeSingle();
    if (invErr || !invoice) return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (invoice.status === "payee") {
      return new Response(JSON.stringify({ error: "Invoice already paid" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ownership: assigned_user_id == user.id OR service_clients.user_id == user.id OR staff
    const { data: client } = await sb.from("service_clients").select("user_id").eq("id", invoice.client_id).maybeSingle();
    const { data: isAdminRows } = await sb.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin","agent","comptable"]);
    const isStaff = (isAdminRows?.length ?? 0) > 0;
    const isAssigned = invoice.assigned_user_id === user.id;
    const isClientOwner = client?.user_id === user.id;
    if (!isStaff && !isAssigned && !isClientOwner) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    const amountCents = Math.round(Number(invoice.total) * 100);
    if (!amountCents || amountCents < 50) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const currency = (invoice.currency || "cad").toLowerCase();

    const env: StripeEnv = environment;
    const stripe = createStripeClient(env);
    const customerId = await resolveOrCreateCustomer(stripe, { email: user.email, userId: user.id });

    const description = `Facture ${invoice.invoice_number}`;
    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency,
          product_data: { name: description, tax_code: "txcd_10000000" },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      customer: customerId,
      payment_intent_data: { description },
      metadata: { userId: user.id, invoice_id: invoice.id, kind: "service_invoice" },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("create-invoice-checkout error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
