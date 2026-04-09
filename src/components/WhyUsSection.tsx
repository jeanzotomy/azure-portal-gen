import { Award, Users, BarChart3, Lock, MapPin, Languages } from "lucide-react";

const reasons = [
  { icon: Award, title: "Expertise certifiée", desc: "Multi-cloud : AWS, Azure, GCP, MS 365." },
  { icon: Users, title: "Approche personnalisée", desc: "Solutions adaptées à votre industrie." },
  { icon: BarChart3, title: "Résultats garantis", desc: "KPIs et SLA mesurables." },
  { icon: Lock, title: "Conformité & Innovation", desc: "Confidentialité et standards élevés." },
  { icon: MapPin, title: "Équipe locale", desc: "Proactive et disponible localement." },
  { icon: Languages, title: "Expérience francophone", desc: "Accompagnement bilingue français-anglais dans tous vos projets." },
];

export function WhyUsSection() {
  return (
    <section id="why-us" className="py-24 bg-background">
      <div className="container">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">Avantages</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">
            Pourquoi choisir <span className="gradient-text">Cloud Mature?</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((r) => (
            <div
              key={r.title}
              className="group relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-card-hover hover:border-primary/30 overflow-hidden"
            >
              {/* Subtle hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

              <div className="relative flex items-center gap-4 mb-3">
                <div className="relative w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors duration-300">
                  <r.icon size={22} className="text-primary transition-transform duration-300 group-hover:scale-110" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300">{r.title}</h3>
              </div>
              <p className="relative text-sm text-muted-foreground leading-relaxed pl-16">{r.desc}</p>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent transition-all duration-300" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
