import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  priceId?: string;
  invoiceId?: string;
  quantity?: number;
  customerEmail?: string;
  userId?: string;
  returnUrl?: string;
}

export function StripeEmbeddedCheckout({ priceId, invoiceId, quantity, customerEmail, userId, returnUrl }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const fnName = invoiceId ? "create-invoice-checkout" : "create-checkout";
    const body: any = invoiceId
      ? { invoiceId, returnUrl, environment: getStripeEnvironment() }
      : { priceId, quantity, customerEmail, userId, returnUrl, environment: getStripeEnvironment() };

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
