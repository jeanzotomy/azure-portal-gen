import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Sparkles, Smartphone, CreditCard, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useCinetPayCheckout } from "@/hooks/useCinetPayCheckout";
import { useUserRoles } from "@/hooks/use-admin";

import { supabase } from "@/integrations/supabase/client";
import {
  isAfricanCurrency,
  convertFromEur,
  formatAmount,
  type AllCurrency,
  type AfricanCurrency,
} from "@/lib/cinetpay";

type Interval = "monthly" | "yearly";

const STRIPE_CURRENCIES: AllCurrency[] = ["CAD", "USD", "EUR"];
const CINETPAY_CURRENCIES: AfricanCurrency[] = ["GNF", "XOF", "XAF", "CDF"];

// SaaS prices defined in EUR; African currencies are computed dynamically.
const PLANS = [
  {
    id: "saas_starter",
    name: "Starter",
    features: ["Portail client", "1 projet actif", "5 Go SharePoint", "Support email"],
    eur: { monthly: 19, yearly: 190 },
    stripe: {
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
    eur: { monthly: 59, yearly: 590 },
    stripe: {
      cad: { monthly: 89, yearly: 890 },
      usd: { monthly: 65, yearly: 650 },
      eur: { monthly: 59, yearly: 590 },
    },
  },
  {
    id: "saas_enterprise",
    name: "Enterprise",
    features: ["Projets illimités", "500 Go SharePoint", "SSO + Multi-utilisateurs", "Support 24/7"],
    eur: { monthly: 169, yearly: 1690 },
    stripe: {
      cad: { monthly: 249, yearly: 2490 },
      usd: { monthly: 185, yearly: 1850 },
      eur: { monthly: 169, yearly: 1690 },
    },
  },
];

const PACKS = [
  { id: "pack_audit_cloud", name: "Audit Cloud (1 jour)", eur: 800, stripe: { cad: 1200, usd: 890, eur: 800 } },
  { id: "pack_sprint_devops", name: "Sprint DevOps (5 jours)", eur: 3700, stripe: { cad: 5500, usd: 4100, eur: 3700 } },
  { id: "pack_accompagnement", name: "Accompagnement Mensuel (20 h)", eur: 2150, stripe: { cad: 3200, usd: 2400, eur: 2150 } },
];

type PublishedService = {
  id: string;
  name: string;
  description: string | null;
  default_unit_price: number;
  default_currency: "GNF" | "USD" | "EUR";
  default_unit: string;
};

export default function PricingPage() {
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<AllCurrency>("CAD");
  const [interval, setInterval] = useState<Interval>("monthly");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const { openCheckout, closeCheckout, isOpen, checkoutElement } = useStripeCheckout();
  const cinetpay = useCinetPayCheckout();
  const { isAdmin } = useUserRoles();
  const [publishedServices, setPublishedServices] = useState<PublishedService[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ id: data.user.id, email: data.user.email });
    });
    supabase
      .from("service_catalog")
      .select("id, name, description, default_unit_price, default_currency, default_unit")
      .eq("published", true)
      .eq("active", true)
      .order("display_order", { ascending: true })
      .order("name")
      .then(({ data }) => setPublishedServices((data ?? []) as PublishedService[]));
  }, []);

  const usingCinetPay = isAfricanCurrency(currency);

  const getPlanPrice = (plan: typeof PLANS[number]): number => {
    if (usingCinetPay) {
      return convertFromEur(plan.eur[interval], currency);
    }
    return plan.stripe[currency.toLowerCase() as "cad" | "usd" | "eur"][interval];
  };

  const getPackPrice = (pack: typeof PACKS[number]): number => {
    if (usingCinetPay) return convertFromEur(pack.eur, currency);
    return pack.stripe[currency.toLowerCase() as "cad" | "usd" | "eur"];
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      navigate("/auth?redirect=/pricing");
      return;
    }
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) return;

    if (usingCinetPay) {
      const amount = getPlanPrice(plan);
      await cinetpay.redirectToPayment({
        kind: "saas_subscription",
        amount,
        currency: currency as AfricanCurrency,
        description: `Abonnement ${plan.name} (${interval === "monthly" ? "mensuel" : "annuel"})`,
        planId,
        interval,
      });
    } else {
      const priceId = `${planId}_${currency.toLowerCase()}_${interval}`;
      openCheckout({
        priceId,
        userId: user.id,
        customerEmail: user.email,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      });
    }
  };

  const handleBuyPack = async (packId: string) => {
    if (!user) {
      navigate("/auth?redirect=/pricing");
      return;
    }
    const pack = PACKS.find((p) => p.id === packId);
    if (!pack) return;

    if (usingCinetPay) {
      await cinetpay.redirectToPayment({
        kind: "consulting_pack",
        amount: getPackPrice(pack),
        currency: currency as AfricanCurrency,
        description: pack.name,
        planId: packId,
      });
    } else {
      openCheckout({
        priceId: packId,
        userId: user.id,
        customerEmail: user.email,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      });
    }
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

        <div className="flex flex-col items-center gap-4 mb-10">
          <Tabs value={interval} onValueChange={(v) => setInterval(v as Interval)}>
            <TabsList>
              <TabsTrigger value="monthly">Mensuel</TabsTrigger>
              <TabsTrigger value="yearly">Annuel <Badge variant="secondary" className="ml-2">-17%</Badge></TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground mr-2">International :</span>
            {STRIPE_CURRENCIES.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={currency === c ? "default" : "outline"}
                onClick={() => setCurrency(c)}
              >
                {c}
              </Button>
            ))}
            <span className="text-xs text-muted-foreground mx-2">|</span>
            <span className="text-xs text-muted-foreground mr-2">Afrique :</span>
            {CINETPAY_CURRENCIES.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={currency === c ? "default" : "outline"}
                onClick={() => setCurrency(c)}
              >
                {c}
              </Button>
            ))}
          </div>

          {usingCinetPay && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Smartphone className="h-3.5 w-3.5" />
              <span>Paiement via Mobile Money (Orange, MTN, Moov, Wave) ou carte bancaire</span>
            </div>
          )}
          {!usingCinetPay && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Paiement par carte sécurisé (Stripe)</span>
            </div>
          )}
        </div>

        {cinetpay.error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 space-y-2">
            <p className="font-medium">{cinetpay.error}</p>
            {isAdmin ? (
              <p className="text-xs">
                <Link to="/admin?tab=integrations" className="underline font-semibold">
                  Configurer CinetPay dans Admin → Intégrations →
                </Link>
              </p>
            ) : (
              <p className="text-xs text-red-700">
                Le paiement Mobile Money est temporairement indisponible. Choisis une devise internationale (CAD / USD / EUR) ou réessaie plus tard.
              </p>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const price = getPlanPrice(plan);
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
                    <span className="text-3xl md:text-4xl font-bold text-foreground">
                      {formatAmount(price, currency)}
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
                    disabled={cinetpay.loading}
                  >
                    {cinetpay.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "S'abonner"}
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
            {PACKS.map((pack) => (
              <Card key={pack.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{pack.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      {formatAmount(getPackPrice(pack), currency)}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => handleBuyPack(pack.id)}
                    disabled={cinetpay.loading}
                  >
                    Acheter
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {publishedServices.length > 0 && (
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-2">Services à la carte</h2>
            <p className="text-muted-foreground mb-6">Prestations issues de notre catalogue — contactez-nous pour un devis personnalisé.</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-left">
              {publishedServices.map((s) => (
                <Card key={s.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    {s.description && (
                      <CardDescription className="italic text-xs">{s.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-2xl font-bold text-foreground">
                        {new Intl.NumberFormat("fr-FR").format(s.default_unit_price)} {s.default_currency}
                      </span>
                      <span className="text-xs text-muted-foreground"> / {s.default_unit}</span>
                    </div>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to="/#contact">Demander un devis</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}


        {usingCinetPay && (
          <p className="text-xs text-muted-foreground text-center mt-10 max-w-xl mx-auto">
            <strong>Note CinetPay :</strong> les abonnements en devises africaines sont facturés en paiements uniques (pas de renouvellement automatique). Tu recevras un rappel par email 7 jours avant la fin de période pour renouveler.
          </p>
        )}
      </main>

      <Footer />

      <Dialog open={isOpen} onOpenChange={(o) => { if (!o) closeCheckout(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col gap-0">
          <DialogHeader className="shrink-0 px-5 sm:px-8 md:px-10 pt-5 sm:pt-6 md:pt-7 pb-4 sm:pb-5 pr-12 sm:pr-14 border-b bg-gradient-primary-deep text-primary-foreground space-y-1.5 text-left">
            <DialogTitle className="text-primary-foreground text-xl font-semibold leading-tight">
              Paiement sécurisé
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/85 text-sm leading-relaxed">
              Powered by Stripe — données chiffrées de bout en bout.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-2">{checkoutElement}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
