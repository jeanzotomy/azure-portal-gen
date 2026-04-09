import { Award, Users, BarChart3, Lock, MapPin, Languages } from "lucide-react";
import whyUsImage from "@/assets/why-us-image.png";

const reasons = [
  { icon: Award, title: "Expertise certifiée", desc: "Multi-cloud : AWS, Azure, GCP, MS 365." },
  { icon: Users, title: "Approche personnalisée", desc: "Solutions adaptées à votre industrie." },
  { icon: BarChart3, title: "Résultats garantis", desc: "KPIs et SLA mesurables." },
  { icon: Lock, title: "Conformité & Innovation", desc: "Confidentialité et standards élevés." },
  { icon: MapPin, title: "Équipe locale", desc: "Proactive et disponible localement." },
  { icon: Languages, title: "Expérience francophone", desc: "Accompagnement bilingue français-anglais dans tous vos projets." },
];

function ReasonCard({ r }: { r: typeof reasons[number] }) {
  return (
    <div className="group relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-card-hover hover:border-primary/30 overflow-hidden">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <div className="relative flex items-center gap-4 mb-3">
        <div className="relative w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors duration-300">
          <r.icon size={22} className="text-primary transition-transform duration-300 group-hover:scale-110" />
        </div>
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300">{r.title}</h3>
      </div>
      <p className="relative text-sm text-muted-foreground leading-relaxed pl-16">{r.desc}</p>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent transition-all duration-300" />
    </div>
  );
}

export function WhyUsSection() {
  const topRow = reasons.slice(0, 2);
  const middleLeft = [reasons[2]];
  const middleRight = [reasons[3]];
  const bottomRow = reasons.slice(4, 6);

  return (
    <section id="why-us" className="py-24 bg-background">
      <div className="container">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">Avantages</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">
            Pourquoi choisir <span className="gradient-text">Cloud Mature?</span>
          </h2>
        </div>

        {/* Mobile: simple stack */}
        <div className="flex flex-col gap-5 lg:hidden">
          {reasons.map((r) => (
            <ReasonCard key={r.title} r={r} />
          ))}
          <div className="relative group overflow-hidden rounded-2xl">
            <img src={whyUsImage} alt="Professionnelle Cloud Mature" className="w-full h-64 object-cover object-top rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-secondary/90 via-secondary/30 to-transparent rounded-2xl" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Cloud Mature</p>
              <p className="text-lg font-bold text-primary-foreground mt-1">Votre partenaire de confiance</p>
            </div>
          </div>
        </div>

        {/* Desktop: wrapped layout with image in center */}
        <div className="hidden lg:flex flex-col gap-6">
          {/* Top row: 2 cards */}
          <div className="grid grid-cols-2 gap-6">
            {topRow.map((r) => (
              <ReasonCard key={r.title} r={r} />
            ))}
          </div>

          {/* Middle row: card + image + card */}
          <div className="grid grid-cols-3 gap-6">
            {middleLeft.map((r) => (
              <ReasonCard key={r.title} r={r} />
            ))}
            <div className="relative group overflow-hidden rounded-2xl">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 blur-lg opacity-60 group-hover:opacity-90 transition-opacity duration-500" />
              <div className="relative overflow-hidden rounded-2xl h-full border border-primary/20">
                <img src={whyUsImage} alt="Professionnelle Cloud Mature" className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/90 via-secondary/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-sm font-semibold uppercase tracking-wider text-primary">Cloud Mature</p>
                  <p className="text-lg font-bold text-primary-foreground mt-1">Votre partenaire de confiance</p>
                </div>
              </div>
            </div>
            {middleRight.map((r) => (
              <ReasonCard key={r.title} r={r} />
            ))}
          </div>

          {/* Bottom row: 2 cards */}
          <div className="grid grid-cols-2 gap-6">
            {bottomRow.map((r) => (
              <ReasonCard key={r.title} r={r} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
