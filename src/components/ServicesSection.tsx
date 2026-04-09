import { Cloud, DollarSign, Shield, Server, ArrowUpRight, GraduationCap, Headphones, BrainCircuit } from "lucide-react";

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
    desc: "Évaluation de maturité IA, stratégie d'adoption, intégration de solutions d'intelligence artificielle et accompagnement vers l'IA responsable.",
  },
];

export function ServicesSection() {
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s, i) => (
            <div key={s.title}
              className={`group bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 ${i === services.length - 1 ? "md:col-span-2 lg:col-span-1" : ""}`}
            >
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <s.icon size={22} className="text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
