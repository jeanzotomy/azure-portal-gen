import logo from "@/assets/logo.png";
import { useTranslation } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-secondary py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={logo} alt="CloudMature" className="h-12 w-auto max-w-[190px]" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-secondary-foreground/50">
              {t("footer.partners") || "Nos partenaires"}
            </span>
            <div className="flex items-center gap-6 md:gap-8 flex-wrap justify-center">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
                alt="Microsoft"
                loading="lazy"
                className="h-6 md:h-7 w-auto opacity-70 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg"
                alt="Google"
                loading="lazy"
                className="h-6 md:h-7 w-auto opacity-70 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/6/64/Datadog_logo.svg"
                alt="Datadog"
                loading="lazy"
                className="h-6 md:h-7 w-auto opacity-70 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass text-sm font-medium tracking-wide border border-cyan-glow/30 shadow-[0_0_15px_hsl(195_100%_40%/0.15)]">
            <span className="text-cyan-glow">{t("hero.badge.consulting")}</span>
            <span className="text-secondary-foreground/40">·</span>
            <span className="text-cyan-glow">{t("hero.badge.cloud")}</span>
            <span className="text-secondary-foreground/40">·</span>
            <span className="text-cyan-glow">{t("hero.badge.devops")}</span>
            <span className="text-secondary-foreground/40">·</span>
            <span className="gradient-text font-semibold">{t("hero.badge.ai")}</span>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-secondary-foreground/10">
          <p className="text-sm text-secondary-foreground/60">
            {t("footer.copyright").replace("{year}", String(new Date().getFullYear()))}
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link to="/careers" className="text-sm text-secondary-foreground/60 hover:text-primary transition-colors">
              Carrières
            </Link>
            <span className="text-secondary-foreground/30">|</span>
            <Link to="/privacy" className="text-sm text-secondary-foreground/60 hover:text-primary transition-colors">
              {t("footer.privacy")}
            </Link>
            <span className="text-secondary-foreground/30">|</span>
            <Link to="/terms" className="text-sm text-secondary-foreground/60 hover:text-primary transition-colors">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
