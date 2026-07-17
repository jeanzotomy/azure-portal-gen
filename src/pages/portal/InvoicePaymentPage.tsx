import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Loader2 } from "lucide-react";

export default function InvoicePaymentPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");

  useEffect(() => {
    document.title = "Paiement de facture · CloudMature";
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (!invoiceId) {
        setError("Facture introuvable");
        return;
      }
      const { data } = await supabase
        .from("service_invoices")
        .select("invoice_number")
        .eq("id", invoiceId)
        .maybeSingle();
      if (data?.invoice_number) setInvoiceNumber(data.invoice_number);
      setReady(true);
    })();
  }, [invoiceId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!ready || !invoiceId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <PaymentTestModeBanner />
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-primary">
            Paiement de la facture {invoiceNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            Vous pouvez fermer cet onglet une fois le paiement effectué.
          </p>
        </div>
        <div className="bg-background rounded-lg border shadow-sm overflow-hidden">
          <StripeEmbeddedCheckout
            invoiceId={invoiceId}
            returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
          />
        </div>
      </div>
    </div>
  );
}
