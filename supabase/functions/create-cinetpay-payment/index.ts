import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, loadCinetPayCreds, initPayment, normalizeAmount, type CinetPayCurrency } from "../_shared/cinetpay.ts";

type Kind = "saas_subscription" | "training" | "service_invoice" | "consulting_pack";

interface Body {
  kind: Kind;
  amount: number;
  currency: CinetPayCurrency;
  description: string;
  relatedId?: string;
  relatedRef?: string;
  planId?: string;          // for saas_subscription / consulting_pack
  interval?: "monthly" | "yearly"; // for saas
  customer?: {
    name?: string;
    surname?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    state?: string;
    zipCode?: string;
  };
  returnUrl?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const creds = await loadCinetPayCreds();
    if (!creds) {
      return new Response(JSON.stringify({
        error: "CinetPay non configuré. Renseignez API Key, Site ID et Secret Key dans Admin → Intégrations → CinetPay."
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!creds.enabled) {
      return new Response(JSON.stringify({
        error: "CinetPay est désactivé. Activez-le dans Admin → Intégrations → CinetPay."
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json() as Body;
    if (!body.kind || !body.amount || !body.currency) {
      return new Response(JSON.stringify({ error: "kind, amount et currency sont requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve current user (optional — paying anonymously not allowed for SaaS)
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userEmail: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await sb.auth.getUser(token);
      if (data?.user) {
        userId = data.user.id;
        userEmail = data.user.email ?? null;
      }
    }
    if (!userId && body.kind !== "service_invoice") {
      return new Response(JSON.stringify({ error: "Authentification requise" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profile for prefill
    let profile: any = null;
    if (userId) {
      const { data } = await sb.from("profiles").select("full_name,phone,company,location").eq("user_id", userId).maybeSingle();
      profile = data;
    }

    const amount = normalizeAmount(body.amount, body.currency);
    if (amount < 100) {
      return new Response(JSON.stringify({ error: "Montant trop faible (min 100)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert pending transaction (triggers generate transaction_id)
    const { data: tx, error: txErr } = await sb.from("cinetpay_transactions").insert({
      user_id: userId,
      customer_email: userEmail ?? body.customer?.name,
      customer_name: profile?.full_name ?? body.customer?.name ?? "Client",
      customer_phone: profile?.phone ?? body.customer?.phone ?? null,
      amount,
      currency: body.currency,
      kind: body.kind,
      related_id: body.relatedId ?? null,
      related_ref: body.relatedRef ?? null,
      description: body.description,
      metadata: {
        planId: body.planId,
        interval: body.interval,
      },
      environment: "sandbox",
    }).select("id, transaction_id").single();

    if (txErr || !tx) {
      console.error("Insert tx failed:", txErr);
      return new Response(JSON.stringify({ error: "Création de la transaction échouée" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notifyUrl = `${SUPABASE_URL}/functions/v1/cinetpay-webhook`;
    const returnUrl = body.returnUrl
      ?? `${req.headers.get("origin") ?? "https://cloudmature.com"}/checkout/return?provider=cinetpay&transaction_id=${tx.transaction_id}`;

    const result = await initPayment(creds, {
      transactionId: tx.transaction_id,
      amount,
      currency: body.currency,
      description: body.description.slice(0, 240),
      notifyUrl,
      returnUrl,
      customer: {
        id: userId ?? tx.transaction_id,
        name: (profile?.full_name?.split(" ")[0]) || body.customer?.name || "Client",
        surname: (profile?.full_name?.split(" ").slice(1).join(" ")) || body.customer?.surname || "CloudMature",
        email: userEmail || body.customer?.name || "client@cloudmature.com",
        phone: profile?.phone ?? body.customer?.phone,
        address: body.customer?.address,
        city: body.customer?.city ?? profile?.location,
        country: body.customer?.country ?? "GN",
        state: body.customer?.state ?? "CK",
        zipCode: body.customer?.zipCode,
      },
      channels: "ALL",
      metadata: JSON.stringify({ user_id: userId, kind: body.kind, related_id: body.relatedId }),
    });

    if (!result.ok || result.json?.code !== "201") {
      console.error("CinetPay init failed:", result.json);
      await sb.from("cinetpay_transactions").update({
        status: "echoue",
        cinetpay_response: result.json,
      }).eq("id", tx.id);
      return new Response(JSON.stringify({
        error: result.json?.message || "Initialisation CinetPay échouée",
        details: result.json,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const paymentUrl = result.json?.data?.payment_url;
    const paymentToken = result.json?.data?.payment_token;

    await sb.from("cinetpay_transactions").update({
      payment_url: paymentUrl,
      cinetpay_response: result.json,
      cpm_payid: paymentToken,
    }).eq("id", tx.id);

    return new Response(JSON.stringify({
      transaction_id: tx.transaction_id,
      payment_url: paymentUrl,
      payment_token: paymentToken,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("create-cinetpay-payment error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Erreur serveur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
