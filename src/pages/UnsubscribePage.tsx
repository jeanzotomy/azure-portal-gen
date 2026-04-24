import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MailX, CheckCircle2, XCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
          headers: { apikey: SUPABASE_ANON_KEY },
        });
        const body = await res.json();
        if (res.ok && body.valid) setState("valid");
        else if (body.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    if (error) setState("error");
    else if ((data as any)?.success) setState("done");
    else if ((data as any)?.reason === "already_unsubscribed") setState("already");
    else setState("error");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            {state === "loading" || state === "submitting" ? <Loader2 className="h-12 w-12 text-primary animate-spin" /> :
             state === "done" || state === "already" ? <CheckCircle2 className="h-12 w-12 text-green-600" /> :
             state === "valid" ? <MailX className="h-12 w-12 text-primary" /> :
             <XCircle className="h-12 w-12 text-destructive" />}
          </div>
          {state === "loading" && <p className="text-muted-foreground">Vérification du lien...</p>}
          {state === "valid" && (
            <>
              <h1 className="text-xl font-bold">Se désabonner des emails CloudMature</h1>
              <p className="text-sm text-muted-foreground">Vous ne recevrez plus d'emails non essentiels de notre part.</p>
              <Button onClick={confirm} className="w-full">Confirmer le désabonnement</Button>
            </>
          )}
          {state === "submitting" && <p className="text-muted-foreground">Traitement en cours...</p>}
          {state === "done" && (
            <>
              <h1 className="text-xl font-bold">Désabonnement confirmé</h1>
              <p className="text-sm text-muted-foreground">Votre adresse a été retirée de notre liste d'envoi.</p>
            </>
          )}
          {state === "already" && (
            <>
              <h1 className="text-xl font-bold">Déjà désabonné</h1>
              <p className="text-sm text-muted-foreground">Cette adresse est déjà désabonnée de nos emails.</p>
            </>
          )}
          {state === "invalid" && (
            <>
              <h1 className="text-xl font-bold">Lien invalide</h1>
              <p className="text-sm text-muted-foreground">Ce lien de désabonnement est invalide ou a expiré.</p>
            </>
          )}
          {state === "error" && (
            <>
              <h1 className="text-xl font-bold">Une erreur est survenue</h1>
              <p className="text-sm text-muted-foreground">Veuillez réessayer plus tard.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
