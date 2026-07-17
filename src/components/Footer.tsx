import { useEffect, useState } from "react";
import logo from "@/assets/logo.webp";
import { useTranslation } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Partner = { id: string; name: string; logo_url: string; website_url: string | null };

export function Footer() {
  const { t } = useTranslation();
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("partners")
      .select("id,name,logo_url,website_url")
      .eq("published", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (mounted && data) setPartners(data as Partner[]);
      });
    return () => { mounted = false; };
  }, []);

  return (
    <footer className="bg-secondary py-10 md:py-12">
      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
          <div className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="CloudMature - Conseil Cloud, DevOps et Intelligence Artificielle" width={220} height={48} className="h-12 w-auto" />
          </div>

          {partners.length > 0 && (
            <div className="flex-1 min-w-0 w-full md:w-auto">
              <div className="text-[11px] uppercase tracking-widest text-secondary-foreground/60 text-center mb-2">
                {t("footer.partners") || "Nos partenaires"}
              </div>
              <div className="flex items-center justify-center gap-6 md:gap-8 flex-wrap">
                {partners.map((p) => {
                  const img = (
                    <img
                      src={p.logo_url}
                      alt={p.name}
                      title={p.name}
                      className="h-10 md:h-12 w-auto max-w-[140px] object-contain opacity-80 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
                      loading="lazy"
                    />
                  );
                  return p.website_url ? (
                    <a key={p.id} href={p.website_url} target="_blank" rel="noopener noreferrer" aria-label={p.name}>
                      {img}
                    </a>
                  ) : (
                    <span key={p.id}>{img}</span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass text-sm font-medium tracking-wide border border-cyan-glow/30 shadow-[0_0_15px_hsl(195_100%_40%/0.15)] shrink-0">
            <span className="text-cyan-glow">{t("hero.badge.consulting")}</span>
            <span aria-hidden="true" className="text-cyan-glow/70">·</span>
            <span className="text-cyan-glow">{t("hero.badge.cloud")}</span>
            <span aria-hidden="true" className="text-cyan-glow/70">·</span>
            <span className="text-cyan-glow">{t("hero.badge.devops")}</span>
            <span aria-hidden="true" className="text-cyan-glow/70">·</span>
            <span className="text-cyan-glow font-semibold">{t("hero.badge.ai")}</span>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 md:mt-10 pt-6 border-t border-secondary-foreground/20">
          <p className="text-sm text-secondary-foreground/85">
            {t("footer.copyright").replace("{year}", String(new Date().getFullYear()))}
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link to="/careers" className="text-sm text-secondary-foreground/85 hover:text-primary transition-colors">
              Carrières
            </Link>
            <span aria-hidden="true" className="text-secondary-foreground/60">|</span>
            <Link to="/privacy" className="text-sm text-secondary-foreground/85 hover:text-primary transition-colors">
              {t("footer.privacy")}
            </Link>
            <span aria-hidden="true" className="text-secondary-foreground/60">|</span>
            <Link to="/terms" className="text-sm text-secondary-foreground/85 hover:text-primary transition-colors">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
