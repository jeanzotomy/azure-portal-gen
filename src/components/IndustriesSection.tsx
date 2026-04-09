import { Landmark, ShieldCheck, Mountain, Building2, Rocket, MonitorSmartphone } from "lucide-react";

const industries = [
  { icon: Landmark, title: "Banques & Finance", desc: "Sécurité et conformité accrues pour les institutions financières.", color: "from-primary to-cyan-500" },
  { icon: ShieldCheck, title: "Assurances", desc: "Gestion efficace des charges de travail critiques.", color: "from-teal-500 to-primary" },
  { icon: Mountain, title: "Compagnies Minières", desc: "Connectivité hybride, Edge computing, IoT.", color: "from-secondary to-slate-700" },
  { icon: Building2, title: "Gouvernements", desc: "Souveraineté des données et résilience.", color: "from-secondary to-primary" },
  { icon: Rocket, title: "Startups", desc: "Accélération du go-to-market et innovation continue.", color: "from-primary to-accent" },
  { icon: MonitorSmartphone, title: "IT", desc: "Modernisation des infrastructures et transformation digitale.", color: "from-cyan-500 to-teal-500" },
];

export function IndustriesSection() {
  return (
    <section id="industries" className="py-24 bg-gradient-to-b from-white via-white to-background relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="container relative z-10">
        {/* Header */}
        <div className="text-center mb-14">
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

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
          {industries.map((ind, i) => (
            <div
              key={ind.title}
              className="relative group"
            >
              {/* Card */}
              <div className="relative bg-white rounded-2xl pt-12 pb-8 px-8 text-center border border-muted/50 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12)] transition-all duration-500 hover:-translate-y-1">
                {/* Floating icon — positioned above the card */}
                <div className={`absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-xl bg-gradient-to-br ${ind.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                  <ind.icon size={26} className="text-white" />
                </div>

                {/* Top accent bar */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-0 group-hover:w-2/3 bg-gradient-to-r ${ind.color} transition-all duration-500 rounded-b-full`} />

                <h3 className="font-bold text-secondary text-lg mb-2 mt-1">{ind.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{ind.desc}</p>

                {/* Hover CTA */}
                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                  <span className="text-primary text-sm font-medium">En savoir plus →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
