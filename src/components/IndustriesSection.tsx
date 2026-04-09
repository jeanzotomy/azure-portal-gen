import { Landmark, ShieldCheck, Mountain, Building2, Rocket, MonitorSmartphone } from "lucide-react";

const industries = [
  { icon: Landmark, title: "Banques & Finance", desc: "Sécurité et conformité accrues pour les institutions financières.", color: "from-primary to-cyan-500" },
  { icon: ShieldCheck, title: "Assurances", desc: "Gestion efficace des charges de travail critiques.", color: "from-primary to-teal-500" },
  { icon: Mountain, title: "Compagnies Minières", desc: "Connectivité hybride, Edge computing, IoT.", color: "from-secondary to-slate-700" },
  { icon: Building2, title: "Gouvernements", desc: "Souveraineté des données et résilience.", color: "from-secondary to-primary" },
  { icon: Rocket, title: "Startups", desc: "Accélération du go-to-market et innovation continue.", color: "from-primary to-accent" },
  { icon: MonitorSmartphone, title: "IT", desc: "Modernisation des infrastructures et transformation digitale.", color: "from-cyan-500 to-teal-500" },
];

export function IndustriesSection() {
  return (
    <section id="industries" className="py-24 bg-gradient-to-b from-white to-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="container relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold uppercase tracking-wider text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-4">
            Industries
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-secondary">
            À qui s'adressent <span className="text-primary">nos services?</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg">
            Nous accompagnons les organisations de tous secteurs dans leur transformation numérique.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {industries.map((ind) => (
            <div
              key={ind.title}
              className="relative bg-white rounded-xl p-5 text-center border border-border/60 hover:border-transparent shadow-[0_2px_16px_0_hsl(var(--primary)/0.07)] hover:shadow-[0_8px_32px_0_hsl(var(--primary)/0.13)] transition-all duration-500 group overflow-hidden"
            >
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${ind.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 scale-[1.02]`} />
              <div className="absolute inset-[2px] rounded-xl bg-white -z-[5]" />

              <div className={`absolute top-0 left-1/2 -translate-x-1/2 h-1 w-0 group-hover:w-full bg-gradient-to-r ${ind.color} transition-all duration-500 rounded-t-xl`} />

              <div className={`mx-auto w-12 h-12 rounded-xl bg-gradient-to-br ${ind.color} flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}>
                <ind.icon size={22} className="text-white" />
              </div>
              <h3 className="font-bold text-secondary text-base mb-1">{ind.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{ind.desc}</p>

              <div className="mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <span className="text-primary text-xs font-medium">En savoir plus →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
