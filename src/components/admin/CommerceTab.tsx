import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Briefcase, BookOpen, Receipt, CreditCard, Tag, Plug, ExternalLink, AlertCircle, Eye, EyeOff } from "lucide-react";
import ServiceClientsTab from "@/components/ServiceClientsTab";
import ServiceCatalogTab from "@/components/ServiceCatalogTab";
import ServiceInvoicesTab from "@/components/ServiceInvoicesTab";
import PaymentMethodsTab from "@/components/PaymentMethodsTab";
import CinetPayConfigCard from "@/components/admin/CinetPayConfigCard";
import { Link } from "react-router-dom";
import { useSiteSetting } from "@/hooks/use-site-setting";
import { toast } from "sonner";

interface CommerceTabProps {
  initialSection?: CommerceSection;
}

export type CommerceSection = "clients" | "catalog" | "invoices" | "methods" | "pricing" | "providers";

export default function CommerceTab({ initialSection = "catalog" }: CommerceTabProps) {
  const [section, setSection] = useState<CommerceSection>(initialSection);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tag className="text-primary" /> Commerce
        </h1>
        <p className="text-sm text-muted-foreground">
          Catalogue, tarification, facturation et providers de paiement — un seul écran.
        </p>
      </div>

      <Tabs value={section} onValueChange={(v) => setSection(v as CommerceSection)} className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="clients" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Clients</TabsTrigger>
          <TabsTrigger value="catalog" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Catalogue</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><Receipt className="h-3.5 w-3.5" /> Facturation</TabsTrigger>
          <TabsTrigger value="methods" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Modes paiement</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-1.5"><Tag className="h-3.5 w-3.5" /> Tarifs SaaS</TabsTrigger>
          <TabsTrigger value="providers" className="gap-1.5"><Plug className="h-3.5 w-3.5" /> Providers</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4"><ServiceClientsTab /></TabsContent>
        <TabsContent value="catalog" className="mt-4"><ServiceCatalogTab /></TabsContent>
        <TabsContent value="invoices" className="mt-4"><ServiceInvoicesTab /></TabsContent>
        <TabsContent value="methods" className="mt-4"><PaymentMethodsTab /></TabsContent>

        <TabsContent value="pricing" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tarifs SaaS publics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                La grille de prix Starter / Pro / Enterprise s'affiche sur la page publique <code>/pricing</code>.
                Les prix sont définis côté frontend (composant <code>PricingPage.tsx</code>).
                Routage automatique : Stripe pour CAD/USD/EUR, CinetPay pour GNF/XOF/XAF/CDF.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/pricing" target="_blank">
                    Voir la page Tarifs <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/formations" target="_blank">
                    Voir la boutique Formations <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
              <div className="rounded-md border bg-muted/20 p-3 text-xs flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Pour modifier les montants ou ajouter un plan, demande à l'assistant : « Mets à jour les tarifs SaaS… ».</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="mt-4 space-y-4">
          <CinetPayConfigCard />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Stripe (paiements internationaux)
              </CardTitle>
              <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" /> Non disponible en Guinée</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Stripe gère les paiements en CAD, USD et EUR pour les clients hors zone Afrique francophone.
                Les clés sont configurées via le connecteur Lovable (secrets <code>STRIPE_SANDBOX_API_KEY</code>).
              </p>
              <Button asChild variant="outline" size="sm">
                <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">
                  Dashboard Stripe <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
