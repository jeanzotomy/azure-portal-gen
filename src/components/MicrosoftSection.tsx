import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageContext";
import { BadgeCheck, ArrowRightLeft, Bot, CheckCircle2, ArrowRight } from "lucide-react";
import banner1 from "@/assets/cloudmature-banner1.png.asset.json";
import banner1b from "@/assets/cloudmature-banner1-2.png.asset.json";
import banner2 from "@/assets/cloudmature-banner2.png.asset.json";
import infographic from "@/assets/cm-microsoft-ms365_copilot.png.asset.json";

const valueIcons = [BadgeCheck, ArrowRightLeft, Bot];

export function MicrosoftSection() {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(false);

  const valueProps: { title: string; desc: string }[] = t("microsoft.valueProps");
  const offerItems: string[] = t("microsoft.offerItems");

  return (
    <section id="microsoft-365" className="py-24 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            {t("microsoft.badge")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">
            {t("microsoft.title")}
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            {t("microsoft.subtitle")}
          </p>
        </div>

        {/* Valeurs / value props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {valueProps.map((vp, i) => {
            const Icon = valueIcons[i];
            return (
              <div
                key={vp.title}
                className="bg-card rounded-2xl p-6 border border-border shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="text-primary" size={22} />
                </div>
                <h3 className="font-semibold text-lg text-card-foreground mb-2">
                  {vp.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {vp.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-card mb-12">
          <img
            src={banner1.url}
            alt={t("microsoft.title")}
            loading="lazy"
            decoding="async"
            className="w-full h-auto"
          />
        </div>

        {/* Bloc explicatif */}
        <div className="bg-card rounded-2xl p-8 md:p-10 border border-border shadow-card mb-12">
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            {t("microsoft.whyTitle")}
          </h3>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-4xl">
            {t("microsoft.whyText")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mb-12">
          <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-card">
            <img
              src={banner2.url}
              alt={t("microsoft.title")}
              loading="lazy"
              decoding="async"
              className="w-full h-auto"
            />
          </div>

          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setZoom(true)}
              className="block w-full rounded-2xl overflow-hidden border border-border bg-card shadow-card hover:shadow-card-hover transition-shadow"
              aria-label={t("microsoft.infographicHint")}
            >
              <img
                src={infographic.url}
                alt={t("microsoft.title")}
                loading="lazy"
                decoding="async"
                className="w-full h-auto"
              />
            </button>
            <p className="text-xs text-center text-muted-foreground">
              {t("microsoft.infographicHint")}
            </p>
          </div>
        </div>

        {/* Offre + CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <div className="bg-card rounded-2xl p-8 border border-border shadow-card">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-6">
              {t("microsoft.offerTitle")}
            </h3>
            <ul className="space-y-3">
              {offerItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="text-primary shrink-0 mt-0.5" size={18} />
                  <span className="text-muted-foreground leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl p-8 text-primary-foreground flex flex-col justify-center bg-gradient-to-br from-primary to-primary/80">
            <h3 className="text-xl md:text-2xl font-bold mb-4">
              {t("microsoft.ctaTitle")}
            </h3>
            <p className="mb-6 opacity-90 leading-relaxed">
              {t("microsoft.ctaText")}
            </p>
            <Button
              size="lg"
              className="w-full sm:w-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() =>
                document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              {t("microsoft.ctaButton")} <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-card">
          <img
            src={banner1b.url}
            alt={t("microsoft.title")}
            loading="lazy"
            decoding="async"
            className="w-full h-auto"
          />
        </div>
      </div>

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-4xl p-0 overflow-auto max-h-[90vh]">
          <img
            src={infographic.url}
            alt={t("microsoft.title")}
            className="w-full h-auto"
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
