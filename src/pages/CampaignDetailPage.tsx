import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSeo } from "@/hooks/use-seo";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCampaignPeriod } from "./CampaignsPage";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface Campaign {
  id: string;
  slug: string;
  title: string;
  type: string;
  short_description: string | null;
  content: string | null;
  cover_image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  start_date: string | null;
  end_date: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  annonce: "Annonce",
  promotion: "Promotion",
  evenement: "Événement",
  formulaire_qualification: "Audit gratuit",
};

export default function CampaignDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [campaign, setCampaign] = useState<Campaign | null | undefined>(undefined);

  useSeo({
    title: campaign ? `${campaign.title} | Cloud Mature` : "Actualité Cloud Mature",
    description: campaign?.short_description ?? "Actualités et offres Cloud Mature.",
    path: `/campagnes/${slug ?? ""}`,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("marketing_campaigns")
        .select("id, slug, title, type, short_description, content, cover_image_url, cta_label, cta_url, start_date, end_date")
        .eq("slug", slug)
        .eq("status", "publiee")
        .maybeSingle();
      if (cancelled) return;
      setCampaign((data as Campaign) ?? null);
      if (data?.id) {
        await supabase.from("campaign_events").insert({
          campaign_id: data.id,
          type: "view",
          user_agent: navigator.userAgent,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const period = campaign ? formatCampaignPeriod(campaign.start_date, campaign.end_date) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-24 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link to="/campagnes"><ArrowLeft className="mr-2 h-4 w-4" /> Toutes les actualités</Link>
        </Button>

        {campaign === undefined && <Skeleton className="h-96 w-full rounded-xl" />}

        {campaign === null && (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Cette actualité n'est pas disponible.
          </p>
        )}

        {campaign && (
          <article className="space-y-6">
            {campaign.cover_image_url && (
              <img
                src={campaign.cover_image_url}
                alt={campaign.title}
                className="w-full rounded-2xl border border-border object-cover"
              />
            )}
            <div className="space-y-3">
              <Badge variant="secondary">{TYPE_LABELS[campaign.type] ?? campaign.type}</Badge>
              <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">{campaign.title}</h1>
              {period && <p className="text-sm text-muted-foreground">{period}</p>}
              {campaign.short_description && (
                <p className="text-lg text-muted-foreground">{campaign.short_description}</p>
              )}
            </div>

            {campaign.content && (
              <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                {campaign.content}
              </div>
            )}

            {campaign.cta_url && (
              <Button asChild size="lg" className="h-12 w-full text-base sm:w-auto">
                <a href={campaign.cta_url}>
                  {campaign.cta_label || "En savoir plus"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}
