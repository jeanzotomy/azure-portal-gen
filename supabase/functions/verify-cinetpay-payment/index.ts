import { createClient } from "npm:@supabase/supabase-js@2";
import { checkPayment, corsHeaders, loadCinetPayCreds } from "../_shared/cinetpay.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const transactionId = url.searchParams.get("transaction_id");
    if (!transactionId) {
      return new Response(JSON.stringify({ error: "transaction_id requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const creds = await loadCinetPayCreds();

    const { data: tx } = await sb.from("cinetpay_transactions")
      .select("transaction_id, status, amount, currency, kind, paid_at")
      .eq("transaction_id", transactionId).maybeSingle();

    if (!tx) {
      return new Response(JSON.stringify({ error: "Transaction introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If still pending and creds available, force re-check on CinetPay
    let cinetpayStatus: string | null = null;
    if (creds && tx.status === "en_attente") {
      const check = await checkPayment(creds, transactionId);
      cinetpayStatus = check.json?.data?.status ?? null;
    }

    return new Response(JSON.stringify({ ...tx, cinetpay_status: cinetpayStatus }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Erreur serveur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
