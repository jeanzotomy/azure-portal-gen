import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AfricanCurrency } from "@/lib/cinetpay";

type Kind = "saas_subscription" | "training" | "service_invoice" | "consulting_pack";

export interface CinetPayCheckoutInput {
  kind: Kind;
  amount: number;
  currency: AfricanCurrency;
  description: string;
  relatedId?: string;
  planId?: string;
  interval?: "monthly" | "yearly";
  returnUrl?: string;
}

export interface CinetPayCheckoutResult {
  transaction_id: string;
  payment_url: string;
  payment_token?: string;
}

export function useCinetPayCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<CinetPayCheckoutResult | null>(null);

  const start = useCallback(async (input: CinetPayCheckoutInput): Promise<CinetPayCheckoutResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const returnUrl = input.returnUrl
        ?? `${window.location.origin}/checkout/return?provider=cinetpay`;
      const { data, error: invokeErr } = await supabase.functions.invoke("create-cinetpay-payment", {
        body: { ...input, returnUrl },
      });
      if (invokeErr) throw new Error(invokeErr.message);
      if (!data?.payment_url) throw new Error(data?.error || "Initialisation CinetPay échouée");
      const result = data as CinetPayCheckoutResult;
      setLast(result);
      return result;
    } catch (e: any) {
      setError(e?.message || "Erreur inconnue");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const redirectToPayment = useCallback(async (input: CinetPayCheckoutInput) => {
    const result = await start(input);
    if (result?.payment_url) {
      // Persist transaction_id for the return page so we can poll its status
      sessionStorage.setItem("cinetpay_pending_tx", result.transaction_id);
      window.location.href = result.payment_url;
    }
  }, [start]);

  return { start, redirectToPayment, loading, error, last };
}
