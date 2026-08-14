import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CampaignCard, type PublicCampaign } from "@/pages/CampaignsPage";
import { ArrowRight } from "lucide-react";

export function NewsSection() {
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("marketing_campaigns")
        .select("id, slug, title, type, short_description, cover_image_url, start_date, end_date")
        .eq("status", "publiee")
        .order("start_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(3);
      if (!cancelled) setCampaigns((data as PublicCampaign[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  if (campaigns.length === 0) return null;

  return (
    <section id="actualites" className="bg-muted/30 py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Actualités &amp; offres</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Nos dernières annonces, promotions et événements.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/campagnes">Tout voir <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}
        </div>
      </div>
    </section>
  );
}
