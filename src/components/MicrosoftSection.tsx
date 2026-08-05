import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTranslation } from "@/i18n/LanguageContext";
import banner1 from "@/assets/cloudmature-banner1.png.asset.json";
import banner1b from "@/assets/cloudmature-banner1-2.png.asset.json";
import banner2 from "@/assets/cloudmature-banner2.png.asset.json";
import infographic from "@/assets/cm-microsoft-ms365_copilot.png.asset.json";

export function MicrosoftSection() {
  const { locale } = useTranslation();
  const fr = locale === "fr";
  const [zoom, setZoom] = useState(false);

  return (
    <section id="microsoft-365" className="py-24 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            {fr ? "Partenaire Microsoft" : "Microsoft Partner"}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">
            Microsoft 365 <span className="text-primary">+ Copilot</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            {fr
              ? "Licences officielles, migration sécurisée, adoption et intégration de l'IA Microsoft dans vos processus métiers."
              : "Official licenses, secure migration, adoption and Microsoft AI integration into your business processes."}
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-card mb-6">
          <img
            src={banner1.url}
            alt={fr ? "Solutions Microsoft 365 et Power Platform par Cloud Mature" : "Microsoft 365 and Power Platform solutions by Cloud Mature"}
            loading="lazy"
            decoding="async"
            className="w-full h-auto"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-card">
            <img
              src={banner2.url}
              alt={fr ? "Travaillez mieux, collaborez partout avec Microsoft 365" : "Work better, collaborate anywhere with Microsoft 365"}
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
              aria-label={fr ? "Agrandir l'infographie Microsoft 365 + Copilot" : "Enlarge the Microsoft 365 + Copilot infographic"}
            >
              <img
                src={infographic.url}
                alt={fr ? "Infographie Microsoft 365, Copilot et IA par Cloud Mature" : "Microsoft 365, Copilot and AI infographic by Cloud Mature"}
                loading="lazy"
                decoding="async"
                className="w-full h-auto"
              />
            </button>
            <p className="text-xs text-center text-muted-foreground">
              {fr ? "Cliquez pour agrandir l'infographie" : "Click to enlarge the infographic"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-card mt-6">
          <img
            src={banner1b.url}
            alt={fr ? "Licences Microsoft 365 et Copilot - demandez votre devis gratuit" : "Microsoft 365 and Copilot licenses - request your free quote"}
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
            alt={fr ? "Infographie Microsoft 365, Copilot et IA par Cloud Mature" : "Microsoft 365, Copilot and AI infographic by Cloud Mature"}
            className="w-full h-auto"
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
