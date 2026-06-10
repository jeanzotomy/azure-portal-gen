import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { ExternalLink, CreditCard, AlertCircle, Sparkles } from "lucide-react";

type Sub = {
  id: string;
  status: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
};

export default function SubscriptionPage() {
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("subscriptions")
        .select("id, status, price_id, current_period_end, cancel_at_period_end, created_at")
        .eq("user_id", user.id)
        .eq("environment", getStripeEnvironment())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setSub(data as Sub | null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/portal/subscription`,
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Impossible d'ouvrir le portail");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) return <div className="p-6">Chargement…</div>;

  if (!sub) {
    return (
      <div className="p-6 max-w-2xl">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Sparkles className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Aucun abonnement actif</h2>
            <p className="text-muted-foreground">Découvre les plans Starter, Pro et Enterprise pour débloquer plus de projets, de stockage et de support.</p>
            <Button asChild><Link to="/pricing">Voir les plans</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tier = sub.price_id.includes("starter") ? "Starter"
    : sub.price_id.includes("pro") ? "Pro"
    : sub.price_id.includes("enterprise") ? "Enterprise"
    : sub.price_id;
  const billing = sub.price_id.includes("yearly") ? "annuel" : "mensuel";

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard /> Mon abonnement</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{tier} <span className="text-muted-foreground font-normal text-sm">— {billing}</span></span>
            {sub.status === "active" && !sub.cancel_at_period_end && <Badge className="bg-emerald-600">Actif</Badge>}
            {sub.status === "trialing" && <Badge className="bg-blue-600">Essai</Badge>}
            {sub.status === "past_due" && <Badge variant="destructive">Paiement en retard</Badge>}
            {sub.cancel_at_period_end && <Badge variant="outline" className="text-amber-600 border-amber-600">Annulation prévue</Badge>}
            {sub.status === "canceled" && <Badge variant="secondary">Annulé</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sub.current_period_end && (
            <p className="text-sm">
              {sub.cancel_at_period_end ? "Accès jusqu'au " : "Prochain renouvellement : "}
              <strong>{new Date(sub.current_period_end).toLocaleDateString("fr-FR", { dateStyle: "long" })}</strong>
            </p>
          )}
          {sub.status === "past_due" && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Ton dernier paiement a échoué. Mets à jour ta carte via le portail pour éviter la coupure d'accès.</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={openPortal} disabled={portalLoading}>
              {portalLoading ? "Ouverture…" : <>Gérer mon abonnement <ExternalLink className="h-4 w-4 ml-1.5" /></>}
            </Button>
            <Button variant="outline" asChild><Link to="/pricing">Changer de plan</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
