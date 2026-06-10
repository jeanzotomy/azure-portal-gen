import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

type Currency = "cad" | "usd" | "eur";
type Interval = "monthly" | "yearly";

const PLANS = [
  {
    id: "saas_starter",
    name: "Starter",
    features: ["Portail client", "1 projet actif", "5 Go SharePoint", "Support email"],
    prices: {
      cad: { monthly: 29, yearly: 290 },
      usd: { monthly: 22, yearly: 220 },
      eur: { monthly: 19, yearly: 190 },
    },
  },
  {
    id: "saas_pro",
    name: "Pro",
    highlight: true,
    features: ["5 projets actifs", "50 Go SharePoint", "Support prioritaire", "Factures illimitées"],
    prices: {
      cad: { monthly: 89, yearly: 890 },
      usd: { monthly: 65, yearly: 650 },
      eur: { monthly: 59, yearly: 590 },
    },
  },
  {
    id: "saas_enterprise",
    name: "Enterprise",
    features: ["Projets illimités", "500 Go SharePoint", "SSO + Multi-utilisateurs", "Support 24/7"],
    prices: {
      cad: { monthly: 249, yearly: 2490 },
      usd: { monthly: 185, yearly: 1850 },
      eur: { monthly: 169, yearly: 1690 },
    },
  },
];

const CURRENCY_SYMBOL: Record<Currency, string> = { cad: "CA$", usd: "US$", eur: "€" };

export default function PricingPage() {
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<Currency>("cad");
  const [interval, setInterval] = useState<Interval>("monthly");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const { openCheckout, closeCheckout, isOpen, checkoutElement } = useStripeCheckout();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ id: data.user.id, email: data.user.email });
    });
  }, []);

  const handleSubscribe = (planId: string) => {
    if (!user) {
      navigate("/auth?redirect=/pricing");
      return;
    }
    const priceId = `${planId}_${currency}_${interval === "monthly" ? "monthly" : "yearly"}`;
    openCheckout({
      priceId,
      userId: user.id,
      customerEmail: user.email,
      returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PaymentTestModeBanner />
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12 md:py-20 max-w-6xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-bold mb-3">Choisis ton plan CloudMature</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Accès au portail client, suivi de projets, SharePoint et support — abonnement mensuel ou annuel (économise ~17 %).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Tabs value={interval} onValueChange={(v) => setInterval(v as Interval)}>
            <TabsList>
              <TabsTrigger value="monthly">Mensuel</TabsTrigger>
              <TabsTrigger value="yearly">Annuel <Badge variant="secondary" className="ml-2">-17%</Badge></TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
            <TabsList>
              <TabsTrigger value="cad">CAD</TabsTrigger>
              <TabsTrigger value="usd">USD</TabsTrigger>
              <TabsTrigger value="eur">EUR</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const price = plan.prices[currency][interval];
            return (
              <Card key={plan.id} className={plan.highlight ? "border-primary shadow-lg relative" : ""}>
                {plan.highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    <Sparkles className="h-3 w-3 mr-1" /> Le plus populaire
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-4xl font-bold text-foreground">
                      {CURRENCY_SYMBOL[currency]}{price}
                    </span>
                    <span className="text-muted-foreground"> /{interval === "monthly" ? "mois" : "an"}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    S'abonner
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-2">Packs de consulting</h2>
          <p className="text-muted-foreground mb-6">Paiements ponctuels pour des missions ciblées.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { id: "pack_audit_cloud", name: "Audit Cloud (1 jour)", prices: { cad: 1200, usd: 890, eur: 800 } },
              { id: "pack_sprint_devops", name: "Sprint DevOps (5 jours)", prices: { cad: 5500, usd: 4100, eur: 3700 } },
              { id: "pack_accompagnement", name: "Accompagnement Mensuel (20 h)", prices: { cad: 3200, usd: 2400, eur: 2150 } },
            ].map((pack) => (
              <Card key={pack.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{pack.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      {CURRENCY_SYMBOL[currency]}{pack.prices[currency].toLocaleString()}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => handleSubscribe(`${pack.id}`)}
                  >
                    Acheter
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />

      <Dialog open={isOpen} onOpenChange={(o) => { if (!o) closeCheckout(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Paiement sécurisé</DialogTitle>
            <DialogDescription>Powered by Stripe — données chiffrées de bout en bout.</DialogDescription>
          </DialogHeader>
          <div className="p-2">{checkoutElement}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
