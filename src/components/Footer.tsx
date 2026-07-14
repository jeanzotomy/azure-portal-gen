import logo from "@/assets/logo.webp";
import { useTranslation } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";


export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-secondary py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={logo} alt="CloudMature - Conseil Cloud, DevOps et Intelligence Artificielle" width={220} height={48} className="h-12 w-auto" />
          </div>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass text-sm font-medium tracking-wide border border-cyan-glow/30 shadow-[0_0_15px_hsl(195_100%_40%/0.15)]">
            <span className="text-cyan-glow">{t("hero.badge.consulting")}</span>
            <span aria-hidden="true"
  className="text-secondary-foreground/70">·</span>
            <span className="text-cyan-glow">{t("hero.badge.cloud")}</span>
            <span aria-hidden="true"
  className="text-secondary-foreground/70">·</span>
            <span className="text-cyan-glow">{t("hero.badge.devops")}</span>
            <span aria-hidden="true"
  className="text-secondary-foreground/70">·</span>
            <span className="gradient-text font-semibold">{t("hero.badge.ai")}</span>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-secondary-foreground/20">

          <p className="text-sm text-secondary-foreground/85">
            {t("footer.copyright").replace("{year}", String(new Date().getFullYear()))}
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link to="/careers"
  className="text-sm text-secondary-foreground/85 hover:text-primary transition-colors">
              Carrières
            </Link>
            <span aria-hidden="true"
  className="text-secondary-foreground/60">|</span>
            <Link to="/privacy"
  className="text-sm text-secondary-foreground/85 hover:text-primary transition-colors">
              {t("footer.privacy")}
            </Link>
            <span aria-hidden="true"
  className="text-secondary-foreground/60">|</span>
            <Link to="/terms"
  className="text-sm text-secondary-foreground/85 hover:text-primary transition-colors">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
