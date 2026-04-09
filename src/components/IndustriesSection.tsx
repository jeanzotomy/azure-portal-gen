import { Landmark, ShieldCheck, Mountain, Building2, Rocket } from "lucide-react";

const industries = [
  { icon: Landmark, title: "Banques & Finance", desc: "Sécurité et conformité accrues pour les institutions financières." },
  { icon: ShieldCheck, title: "Assurances", desc: "Gestion efficace des charges de travail critiques." },
  { icon: Mountain, title: "Compagnies Minières", desc: "Connectivité hybride, Edge computing, IoT." },
  { icon: Building2, title: "Gouvernements", desc: "Souveraineté des données et résilience." },
  { icon: Rocket, title: "Startups & IT", desc: "Accélération du go-to-market et innovation continue." },
];

export function IndustriesSection() {
  return (
    <section id="industries" className="py-24 gradient-hero">
      <div className="container">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">Industries</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 text-primary-foreground">
            À qui s'adressent <span className="gradient-text">nos services?</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {industries.map((ind) => (
            <div key={ind.title} className="glass rounded-xl p-6 text-center hover:scale-105 transition-transform group">
              <div className="mx-auto w-14 h-14 rounded-full gradient-primary flex items-center justify-center mb-4 group-hover:animate-float">
                <ind.icon size={26} className="text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-primary-foreground mb-2">{ind.title}</h3>
              <p className="text-sm text-secondary-foreground/60">{ind.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
