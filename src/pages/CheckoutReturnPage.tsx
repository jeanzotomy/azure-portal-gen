import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CheckoutReturnPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

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
