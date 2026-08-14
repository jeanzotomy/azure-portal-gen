import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSeo } from "@/hooks/use-seo";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone } from "lucide-react";

export interface PublicCampaign {
  id: string;
  slug: string;
  title: string;
  type: string;
  short_description: string | null;
  cover_image_url: string | null;
  start_date: string | null;
  end_date: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  annonce: "Annonce",
  promotion: "Promotion",
  evenement: "Événement",
  formulaire_qualification: "Audit gratuit",
};

export function formatCampaignPeriod(start: string | null, end: string | null) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  if (start && end) return `Du ${fmt(start)} au ${fmt(end)}`;
  if (start) return `À partir du ${fmt(start)}`;
  if (end) return `Jusqu'au ${fmt(end)}`;
  return null;
}

export function CampaignCard({ campaign }: { campaign: PublicCampaign }) {
  const period = formatCampaignPeriod(campaign.start_date, campaign.end_date);
  return (
    <Link to={`/campagnes/${campaign.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          {campaign.cover_image_url ? (
            <img
              src={campaign.cover_image_url}
              alt={campaign.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/5">
              <Megaphone className="h-10 w-10 text-primary/40" aria-hidden="true" />
            </div>
          )}
        </div>
        <CardContent className="space-y-2 p-5">
          <Badge variant="secondary">{TYPE_LABELS[campaign.type] ?? campaign.type}</Badge>
          <h3 className="text-lg font-bold leading-snug text-foreground group-hover:text-primary">
            {campaign.title}
          </h3>
          {campaign.short_description && (
            <p className="line-clamp-3 text-sm text-muted-foreground">{campaign.short_description}</p>
          )}
          {period && <p className="text-xs text-muted-foreground">{period}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function CampaignsPage() {
  useSeo({
    title: "Actualités & offres Cloud Mature",
    description:
      "Découvrez les annonces, promotions et événements Cloud Mature : Microsoft 365, Copilot, Cloud et formations en Guinée.",
    path: "/campagnes",
  });

  const [campaigns, setCampaigns] = useState<PublicCampaign[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("marketing_campaigns")
        .select("id, slug, title, type, short_description, cover_image_url, start_date, end_date")
        .eq("status", "publiee")
        .order("start_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (!cancelled) setCampaigns((data as PublicCampaign[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Actualités & offres</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Nos annonces, promotions et événements pour accompagner votre transformation numérique.
          </p>
        </header>

        {campaigns === null ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        ) : campaigns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Aucune actualité publiée pour le moment.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
