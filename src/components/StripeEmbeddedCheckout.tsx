import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  priceId?: string;
  invoiceId?: string;
  trainingId?: string;
  currency?: string;
  quantity?: number;
  customerEmail?: string;
  userId?: string;
  returnUrl?: string;
}

export function StripeEmbeddedCheckout({ priceId, invoiceId, trainingId, currency, quantity, customerEmail, userId, returnUrl }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const env = getStripeEnvironment();
    let fnName: string;
    let body: any;
    if (invoiceId) {
      fnName = "create-invoice-checkout";
      body = { invoiceId, returnUrl, environment: env };
    } else if (trainingId) {
      fnName = "create-training-checkout";
      body = { trainingId, currency, returnUrl, environment: env };
    } else {
      fnName = "create-checkout";
      body = { priceId, quantity, customerEmail, userId, returnUrl, environment: env };
    }

    const { data, error } = await supabase.functions.invoke(fnName, { body });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || data?.error || "Impossible de créer la session de paiement");
    }
    return data.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
