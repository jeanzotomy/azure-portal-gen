import { Cloud, DollarSign, Shield, Server, ArrowUpRight, GraduationCap, Headphones, BrainCircuit } from "lucide-react";
import servicesImage from "@/assets/two-business-woman-cafe-2.jpg";

const services = [
  {
    icon: Cloud,
    title: "Stratégie & Adoption Cloud",
    desc: "Évaluation de maturité, feuille de route de transformation, comparatif AWS/Azure/GCP et planification du Cloud Journey.",
  },
  {
    icon: DollarSign,
    title: "Optimisation FinOps",
    desc: "Analyse des dépenses, politiques de réduction de coûts, gouvernance financière et outils de reporting.",
  },
  {
    icon: Shield,
    title: "Gouvernance & Sécurité",
    desc: "Politiques de gouvernance, gestion des identités, conformité ISO 27001, PCI-DSS, SOC 2, RGPD.",
  },
  {
    icon: Server,
    title: "Architecture & Ingénierie",
    desc: "Infrastructures résilientes, Infrastructure-as-Code, microservices et haute disponibilité.",
  },
  {
    icon: ArrowUpRight,
    title: "Migration Cloud",
    desc: "Audit, plans de migration Lift & Shift / Refactoring, zéro interruption garantie.",
  },
  {
    icon: GraduationCap,
    title: "Formation & Coaching",
    desc: "Formations techniques, ateliers pratiques, mentoring personnalisé et plateforme LMS privée.",
  },
  {
    icon: Headphones,
    title: "Infogérance & Support",
    desc: "Surveillance 24/7, support N1-N3, gestion des incidents et suivi SLA.",
  },
  {
    icon: BrainCircuit,
    title: "Adoption & Maturité IA",
    desc: "Évaluation de maturité IA, stratégie d'adoption et intégration de solutions IA responsables dans les processus métiers.",
  },
];

function ServiceCard({ s, index }: { s: typeof services[number]; index?: number }) {
  return (
    <div className="group relative bg-card rounded-2xl p-7 shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 border border-border hover:border-primary/30 overflow-hidden">
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-accent/0 group-hover:from-primary/5 group-hover:to-accent/5 transition-all duration-500 rounded-2xl" />
      
      {/* Glow dot top-right */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary/0 group-hover:bg-primary/10 blur-2xl transition-all duration-500" />
      
      <div className="relative z-10">
        {/* Icon + Title on same line */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl gradient-primary opacity-15 blur-md scale-110 group-hover:opacity-30 transition-opacity duration-500" />
            <div className="relative w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
              <s.icon size={22} className="text-primary-foreground" strokeWidth={1.8} />
            </div>
          </div>
          <h3 className="text-[17px] font-bold text-card-foreground group-hover:text-primary transition-colors duration-300">{s.title}</h3>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
        
        {/* Bottom accent line */}
        <div className="mt-5 h-0.5 w-8 bg-border group-hover:w-14 group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent transition-all duration-500 rounded-full" />
      </div>
    </div>
  );
}

export function ServicesSection() {
  const topRow = services.slice(0, 3);
  const middleLeft = [services[3]];
  const middleRight = [services[4]];
  const bottomRow = services.slice(5, 8);

  return (
    <section id="services" className="py-28 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/3 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/3 blur-3xl pointer-events-none" />
      
      <div className="container relative z-10">
        <div className="text-center mb-20">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Nos Services
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mt-3 text-foreground">
            Solutions de consultation <span className="gradient-text">TI complètes</span>
          </h2>
          <p className="text-muted-foreground mt-5 max-w-2xl mx-auto text-lg">
            De la stratégie à l'opérationnel, nous couvrons l'ensemble du cycle de vie Cloud.
          </p>
        </div>

        {/* Mobile: simple stack */}
        <div className="flex flex-col gap-5 lg:hidden">
          {services.map((s, i) => (
            <ServiceCard key={s.title} s={s} index={i} />
          ))}
          <div className="relative group overflow-hidden rounded-2xl">
            <img src={servicesImage} alt="Équipe Cloud Mature en consultation" className="w-full h-64 object-cover rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-secondary/90 via-secondary/30 to-transparent rounded-2xl" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Cloud Mature</p>
              <p className="text-lg font-bold text-primary-foreground mt-1">L'expertise au service de votre transformation</p>
            </div>
          </div>
        </div>

        {/* Desktop: wrapped layout */}
        <div className="hidden lg:flex flex-col gap-6">
          {/* Top row: 3 cards */}
          <div className="grid grid-cols-3 gap-6">
            {topRow.map((s, i) => (
              <ServiceCard key={s.title} s={s} index={i} />
            ))}
          </div>

          {/* Middle row: 2 cards + image */}
          <div className="grid grid-cols-3 gap-6">
            {middleLeft.map((s) => (
              <ServiceCard key={s.title} s={s} />
            ))}
            <div className="relative group overflow-hidden rounded-2xl">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 blur-lg opacity-60 group-hover:opacity-90 transition-opacity duration-500" />
              <div className="relative overflow-hidden rounded-2xl h-full border border-primary/20">
                <img src={servicesImage} alt="Équipe Cloud Mature en consultation" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/90 via-secondary/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-sm font-semibold uppercase tracking-wider text-primary">Cloud Mature</p>
                  <p className="text-lg font-bold text-primary-foreground mt-1">L'expertise au service de votre transformation</p>
                </div>
              </div>
            </div>
            {middleRight.map((s) => (
              <ServiceCard key={s.title} s={s} />
            ))}
          </div>

          {/* Bottom row: 3 cards */}
          <div className="grid grid-cols-3 gap-6">
            {bottomRow.map((s, i) => (
              <ServiceCard key={s.title} s={s} index={i + 5} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
