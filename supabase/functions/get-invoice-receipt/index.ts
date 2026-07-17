import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

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
    if (!token) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userData, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const { invoiceId, environment } = await req.json();
    if (!invoiceId || (environment !== "sandbox" && environment !== "live")) {
      return json({ error: "Invalid params" }, 400);
    }

    // Verify user owns invoice
    const { data: invoice } = await sb
      .from("service_invoices")
      .select("id, client_id, assigned_user_id, status")
      .eq("id", invoiceId)
      .maybeSingle();
    if (!invoice) return json({ error: "Not found" }, 404);

    const { data: client } = await sb.from("service_clients").select("user_id").eq("id", invoice.client_id).maybeSingle();
    const { data: staffRows } = await sb.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "agent", "comptable"]);
    const isStaff = (staffRows?.length ?? 0) > 0;
    const allowed = isStaff || invoice.assigned_user_id === user.id || client?.user_id === user.id;
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const env: StripeEnv = environment;
    const stripe = createStripeClient(env);

    // Search PaymentIntent by metadata invoice_id
    const search = await stripe.paymentIntents.search({
      query: `metadata['invoice_id']:'${invoiceId}' AND status:'succeeded'`,
      limit: 1,
    });

    let receiptUrl: string | null = null;
    let paidAt: number | null = null;
    let amount: number | null = null;
    let currency: string | null = null;

    if (search.data.length > 0) {
      const pi = search.data[0];
      amount = pi.amount_received ?? pi.amount ?? null;
      currency = pi.currency ?? null;
      paidAt = pi.created ?? null;
      const chargeId = (pi as any).latest_charge as string | null;
      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId);
        receiptUrl = charge.receipt_url ?? null;
      }
    }

    return json({ receiptUrl, paidAt, amount, currency });
  } catch (e: any) {
    console.error("get-invoice-receipt error:", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
