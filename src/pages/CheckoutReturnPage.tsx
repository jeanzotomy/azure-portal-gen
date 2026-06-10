import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatAmount, type AllCurrency } from "@/lib/cinetpay";

type Status = "loading" | "paid" | "pending" | "failed" | "unknown";

export default function CheckoutReturnPage() {
  const [searchParams] = useSearchParams();
  const provider = searchParams.get("provider");
  const sessionId = searchParams.get("session_id");
  const cinetpayTxFromUrl = searchParams.get("transaction_id");

  const [cpStatus, setCpStatus] = useState<Status>(provider === "cinetpay" ? "loading" : "unknown");
  const [cpData, setCpData] = useState<{ amount: number; currency: string; transaction_id: string } | null>(null);

  useEffect(() => {
    if (provider !== "cinetpay") return;
    const txId = cinetpayTxFromUrl || sessionStorage.getItem("cinetpay_pending_tx");
    if (!txId) {
      setCpStatus("unknown");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12; // ~36s total

    const poll = async () => {
      attempts += 1;
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-cinetpay-payment?transaction_id=${encodeURIComponent(txId)}`;
        const res = await fetch(url, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });
        const json = await res.json();
        if (cancelled) return;
        if (json?.status === "paye") {
          setCpStatus("paid");
          setCpData({ amount: json.amount, currency: json.currency, transaction_id: json.transaction_id });
          sessionStorage.removeItem("cinetpay_pending_tx");
          return;
        }
        if (json?.status === "echoue" || json?.status === "annule") {
          setCpStatus("failed");
          setCpData({ amount: json.amount, currency: json.currency, transaction_id: json.transaction_id });
          sessionStorage.removeItem("cinetpay_pending_tx");
          return;
        }
        if (attempts >= maxAttempts) {
          setCpStatus("pending");
          setCpData({ amount: json?.amount ?? 0, currency: json?.currency ?? "", transaction_id: txId });
          return;
        }
        setTimeout(poll, 3000);
      } catch {
        if (attempts >= maxAttempts) { setCpStatus("pending"); return; }
        setTimeout(poll, 3000);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [provider, cinetpayTxFromUrl]);

  // CinetPay branch
  if (provider === "cinetpay") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            {cpStatus === "loading" && (
              <>
                <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
                <h1 className="text-2xl font-bold">Vérification du paiement…</h1>
                <p className="text-muted-foreground">Nous confirmons ta transaction auprès de CinetPay. Cela peut prendre quelques secondes.</p>
              </>
            )}
            {cpStatus === "paid" && cpData && (
              <>
                <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
                <h1 className="text-2xl font-bold">Paiement confirmé !</h1>
                <p className="text-muted-foreground">
                  Nous avons bien reçu ton paiement de <strong>{formatAmount(cpData.amount, cpData.currency as AllCurrency)}</strong>.
                </p>
                <p className="text-xs text-muted-foreground font-mono">Transaction : {cpData.transaction_id}</p>
                <div className="flex gap-2 justify-center pt-2">
                  <Button asChild><Link to="/portal">Aller au portail</Link></Button>
                  <Button variant="outline" asChild><Link to="/">Accueil</Link></Button>
                </div>
              </>
            )}
            {cpStatus === "pending" && (
              <>
                <Clock className="h-16 w-16 text-amber-500 mx-auto" />
                <h1 className="text-2xl font-bold">Paiement en cours de validation</h1>
                <p className="text-muted-foreground">Mobile Money peut prendre quelques minutes à confirmer. Tu recevras un email dès que ton paiement est validé.</p>
                {cpData?.transaction_id && (
                  <p className="text-xs text-muted-foreground font-mono">Transaction : {cpData.transaction_id}</p>
                )}
                <Button asChild><Link to="/portal">Aller au portail</Link></Button>
              </>
            )}
            {cpStatus === "failed" && (
              <>
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
                <h1 className="text-2xl font-bold">Paiement échoué</h1>
                <p className="text-muted-foreground">Ta transaction n'a pas pu être finalisée. Aucun montant n'a été débité. Tu peux réessayer.</p>
                <div className="flex gap-2 justify-center pt-2">
                  <Button asChild><Link to="/pricing">Réessayer</Link></Button>
                  <Button variant="outline" asChild><Link to="/">Accueil</Link></Button>
                </div>
              </>
            )}
            {cpStatus === "unknown" && (
              <>
                <AlertCircle className="h-16 w-16 text-amber-500 mx-auto" />
                <h1 className="text-2xl font-bold">Transaction introuvable</h1>
                <p className="text-muted-foreground">Aucune référence de paiement détectée.</p>
                <Button asChild><Link to="/pricing">Retour aux prix</Link></Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Stripe branch (default)
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          {sessionId ? (
            <>
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
              <h1 className="text-2xl font-bold">Paiement réussi !</h1>
              <p className="text-muted-foreground">
                Merci pour ton achat. Tu vas recevoir un email de confirmation dans quelques instants.
              </p>
              <p className="text-xs text-muted-foreground font-mono break-all">Session : {sessionId}</p>
              <div className="flex gap-2 justify-center pt-2">
                <Button asChild><Link to="/portal">Aller au portail</Link></Button>
                <Button variant="outline" asChild><Link to="/">Accueil</Link></Button>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-16 w-16 text-amber-500 mx-auto" />
              <h1 className="text-2xl font-bold">Session introuvable</h1>
              <p className="text-muted-foreground">Nous n'avons pas pu retrouver les informations de paiement.</p>
              <Button asChild><Link to="/pricing">Retour aux prix</Link></Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
