import { Landmark, ShieldCheck, Mountain, Building2, Rocket, MonitorSmartphone } from "lucide-react";

const industries = [
  { icon: Landmark, title: "Banques & Finance", desc: "Sécurité et conformité accrues pour les institutions financières." },
  { icon: ShieldCheck, title: "Assurances", desc: "Gestion efficace des charges de travail critiques." },
  { icon: Mountain, title: "Compagnies Minières", desc: "Connectivité hybride, Edge computing, IoT." },
  { icon: Building2, title: "Gouvernements", desc: "Souveraineté des données et résilience." },
  { icon: Rocket, title: "Startups", desc: "Accélération du go-to-market et innovation continue." },
  { icon: MonitorSmartphone, title: "IT", desc: "Modernisation des infrastructures et transformation digitale." },
];

export function IndustriesSection() {
  return (
    <section id="industries" className="py-24 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">Industries</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-secondary">
            À qui s'adressent <span className="text-primary">nos services?</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Nous accompagnons les organisations de tous secteurs dans leur transformation numérique.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {industries.map((ind) => (
            <div
              key={ind.title}
              className="bg-white rounded-2xl p-8 text-center border border-muted hover:border-primary/30 hover:shadow-xl transition-all duration-300 group"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <ind.icon size={28} className="text-primary group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-semibold text-secondary text-lg mb-2">{ind.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{ind.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
