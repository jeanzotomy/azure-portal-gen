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

function ServiceCard({ s }: { s: typeof services[number] }) {
  return (
    <div className="group bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
      <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <s.icon size={22} className="text-primary-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-card-foreground mb-2">{s.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
    </div>
  );
}

export function ServicesSection() {
  // Split services: first 3 top-left, last 3 bottom-right, middle 2 beside image
  const topRow = services.slice(0, 3);
  const middleLeft = [services[3]];
  const middleRight = [services[4]];
  const bottomRow = services.slice(5, 8);

  return (
    <section id="services" className="py-24 bg-background">
      <div className="container">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">Nos Services</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-foreground">
            Solutions de consultation <span className="gradient-text">TI complètes</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            De la stratégie à l'opérationnel, nous couvrons l'ensemble du cycle de vie Cloud.
          </p>
        </div>

        {/* Mobile: simple stack */}
        <div className="flex flex-col gap-5 lg:hidden">
          {services.map((s) => (
            <ServiceCard key={s.title} s={s} />
          ))}
          <div className="relative group overflow-hidden rounded-2xl">
            <img src={servicesImage} alt="Équipe Cloud Mature en consultation" className="w-full h-64 object-cover rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-secondary/20 to-transparent rounded-2xl" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Cloud Mature</p>
              <p className="text-lg font-bold text-primary-foreground mt-1">L'expertise au service de votre transformation</p>
            </div>
          </div>
        </div>

        {/* Desktop: wrapped layout */}
        <div className="hidden lg:flex flex-col gap-5">
          {/* Top row: 3 cards */}
          <div className="grid grid-cols-3 gap-5">
            {topRow.map((s) => (
              <ServiceCard key={s.title} s={s} />
            ))}
          </div>

          {/* Middle row: 2 cards + image + text overlay */}
          <div className="grid grid-cols-3 gap-5">
            {leftCol.map((s) => (
              <ServiceCard key={s.title} s={s} />
            ))}
            <div className="relative group overflow-hidden rounded-2xl row-span-1">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 blur-lg opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="relative overflow-hidden rounded-2xl h-full">
                <img
                  src={servicesImage}
                  alt="Équipe Cloud Mature en consultation"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-secondary/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-sm font-semibold uppercase tracking-wider text-primary">Cloud Mature</p>
                  <p className="text-lg font-bold text-primary-foreground mt-1">L'expertise au service de votre transformation</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row: 3 cards */}
          <div className="grid grid-cols-3 gap-5">
            {bottomRow.map((s) => (
              <ServiceCard key={s.title} s={s} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
