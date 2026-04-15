import { useTranslation } from "@/i18n/LanguageContext";
import { Cloud, Cog, BrainCircuit, Users, ShieldCheck, GraduationCap } from "lucide-react";

const missionIcons = [Cloud, Cog, BrainCircuit, Users, ShieldCheck, GraduationCap];

export function AboutSection() {
  const { t } = useTranslation();
  const missions: { title: string; desc: string }[] = t("about.missions");

  return (
    <section id="about" className="py-20 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full translate-x-1/3 translate-y-1/3" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wide">
            {t("about.badge")}
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          {t("about.title")}{" "}
          <span className="gradient-text">{t("about.titleHighlight")}</span>
        </h2>
        <p className="text-muted-foreground text-center max-w-3xl mx-auto mb-6 text-lg leading-relaxed">
          {t("about.description")}
        </p>

        <div className="w-20 h-1 bg-primary/30 rounded-full mx-auto mb-12" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {missions.map((m, i) => {
            const Icon = missionIcons[i] || Cloud;
            return (
              <div
                key={i}
                className="group relative rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-card-hover hover:border-primary/30"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">{m.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
