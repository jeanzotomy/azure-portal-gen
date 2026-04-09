import { Award, Users, BarChart3, Lock, MapPin } from "lucide-react";

const reasons = [
  { icon: Award, title: "Expertise certifiée", desc: "Multi-cloud : AWS, Azure, GCP." },
  { icon: Users, title: "Approche personnalisée", desc: "Solutions adaptées à votre industrie." },
  { icon: BarChart3, title: "Résultats garantis", desc: "KPIs et SLA mesurables." },
  { icon: Lock, title: "Conformité & Innovation", desc: "Confidentialité et standards élevés." },
  { icon: MapPin, title: "Équipe locale", desc: "Proactive et disponible à Montréal." },
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {reasons.map((r) => (
            <div key={r.title} className="text-center group">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:gradient-primary group-hover:shadow-card-hover transition-all duration-300">
                <r.icon size={28} className="text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{r.title}</h3>
              <p className="text-sm text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
