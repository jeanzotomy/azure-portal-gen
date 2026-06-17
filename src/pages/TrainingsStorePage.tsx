import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GraduationCap, Search, Clock, Loader2, ShoppingCart } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useTranslation } from "@/i18n/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import { useSeo } from "@/hooks/use-seo";

type Training = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  category: string | null;
  level: string | null;
  price_cents: number | null;
  currency: string | null;
};

const CURRENCIES = ["CAD", "USD", "EUR"] as const;
type Currency = (typeof CURRENCIES)[number];

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export default function TrainingsStorePage() {
  const { locale } = useTranslation();
  useSeo({
    title: locale === "fr" ? "Formations Cloud, DevOps & IA — CloudMature" : "Cloud, DevOps & AI Trainings — CloudMature",
    description: locale === "fr"
      ? "Catalogue de formations CloudMature : Cloud (Azure, AWS, GCP), DevOps et Intelligence Artificielle. Achetez en ligne, accédez immédiatement."
      : "CloudMature training catalog: Cloud (Azure, AWS, GCP), DevOps and AI. Buy online, instant access.",
    path: "/formations",
  });
  const { user } = useAuthSession();
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState<Currency>("CAD");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { openCheckout, closeCheckout, isOpen, checkoutElement } = useStripeCheckout();

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("trainings")
        .select("id, title, description, duration_minutes, category, level, price_cents, currency")
        .eq("active", true)
        .eq("published", true)
        .eq("audience", "public")
        .order("created_at", { ascending: false });
      setTrainings((data ?? []) as Training[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return trainings;
    return trainings.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q),
    );
  }, [trainings, search]);

  const buy = (t: Training) => {
    if (!user) {
      navigate("/auth?redirect=/formations");
      return;
    }
    const price = t.price_cents ?? 0;
    if (price <= 0) {
      // Free training — redirect to portal trainings
      navigate("/portal?tab=my-trainings");
      return;
    }
    setPendingId(t.id);
    openCheckout({
      trainingId: t.id,
      currency: currency.toLowerCase(),
      customerEmail: user.email,
      userId: user.id,
      returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    });
  };


  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <Navbar />

      <main className="container pt-24 pb-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary mb-4 shadow-lg">
            <GraduationCap size={28} className="text-primary-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {locale === "fr" ? "Catalogue de formations" : "Training catalog"}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            {locale === "fr"
              ? "Achetez une formation à l'unité — accès immédiat depuis votre portail dès le paiement confirmé."
              : "Buy any course as a one-shot — instant access from your portal as soon as payment is confirmed."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6 max-w-3xl mx-auto">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={locale === "fr" ? "Rechercher une formation..." : "Search a training..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 bg-muted rounded-md p-1">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  currency === c ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              {locale === "fr" ? "Aucune formation disponible à l'achat pour le moment." : "No trainings available for purchase yet."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => {
              const price = t.price_cents ?? 0;
              const cur = (t.currency || currency).toUpperCase();
              return (
                <Card key={t.id} className="group hover:shadow-lg transition-shadow flex flex-col">
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-base leading-tight">{t.title}</h3>
                      {t.level && <Badge variant="secondary" className="shrink-0">{t.level}</Badge>}
                    </div>
                    {t.category && (
                      <div className="text-xs text-muted-foreground mb-2">{t.category}</div>
                    )}
                    {t.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{t.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 mt-auto">
                      {t.duration_minutes ? (
                        <span className="flex items-center gap-1"><Clock size={12} />{t.duration_minutes} min</span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-3 border-t">
                      <div>
                        {price > 0 ? (
                          <>
                            <div className="text-2xl font-bold text-primary">{formatPrice(price, cur)}</div>
                            <div className="text-xs text-muted-foreground">{locale === "fr" ? "Paiement unique" : "One-time payment"}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-2xl font-bold text-primary">{locale === "fr" ? "Gratuit" : "Free"}</div>
                            <div className="text-xs text-muted-foreground">{locale === "fr" ? "Accès immédiat" : "Instant access"}</div>
                          </>
                        )}
                      </div>
                      <Button size="sm" onClick={() => buy(t)} disabled={pendingId === t.id && isOpen}>
                        <ShoppingCart size={14} className="mr-1" />
                        {price > 0 ? (locale === "fr" ? "Acheter" : "Buy") : (locale === "fr" ? "Suivre" : "Enroll")}
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!user && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            <Link to="/auth" className="text-primary underline">
              {locale === "fr" ? "Connectez-vous" : "Sign in"}
            </Link>{" "}
            {locale === "fr" ? "pour acheter une formation." : "to purchase a training."}
          </p>
        )}
      </main>

      <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { closeCheckout(); setPendingId(null); } }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>{locale === "fr" ? "Paiement de la formation" : "Training payment"}</DialogTitle>
          </DialogHeader>
          <div className="p-4">{checkoutElement}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
