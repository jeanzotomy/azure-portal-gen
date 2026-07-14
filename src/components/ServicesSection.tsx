import { Cloud, Code2, Server, Blocks, ArrowUpRight, ShieldCheck, Headphones, BrainCircuit, Landmark } from"lucide-react";
import servicesImage from"@/assets/two-business-woman-cafe-2.webp";
import { useTranslation } from"@/i18n/LanguageContext";

const icons = [Cloud, Code2, Server, Blocks, ArrowUpRight, ShieldCheck, Headphones, BrainCircuit, Landmark];

function ServiceCard({ s }: { s: { title: string; desc: string; icon: typeof Cloud } }) {
 return (
 <div className="group relative bg-card rounded-2xl p-7 shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 border border-border hover:border-primary/30 overflow-hidden">
 <div className="relative z-10">
 <div className="flex items-center gap-3 mb-3">
 <div className="relative shrink-0">
 <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-110 transition-all duration-300">
 <s.icon size={22} className="text-primary-foreground" strokeWidth={1.8} />
 </div>
 </div>
 <h3 className="text-[17px] font-bold text-card-foreground group-hover:text-primary transition-colors duration-300">{s.title}</h3>
 </div>
 <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
 <div className="mt-5 h-0.5 w-8 bg-border group-hover:w-14 group-hover:bg-primary transition-all duration-500 rounded-full"/>
 </div>
 </div>
 );
}

export function ServicesSection() {
 const { t } = useTranslation();
 const items: { title: string; desc: string }[] = t("services.items");
 const services = items.map((item, i) => ({ ...item, icon: icons[i] }));

 const reordered = services.length > 0 ? [services[services.length - 1], ...services.slice(0, services.length - 1)] : services;
 const firstFull = reordered[0];
 const topRow = reordered.slice(1, 4);
 const middleLeft = [reordered[4]];
 const middleRight = [reordered[5]];
 const bottomRow = reordered.slice(6);
 

 return (
 <section id="services"className="py-28 bg-background relative overflow-hidden">
 <div className="container relative z-10">
 <div className="text-center mb-20">
 <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold uppercase tracking-wider mb-4">
 <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"/>
 {t("services.badge")}
 </span>
 <h2 className="text-3xl md:text-5xl font-bold mt-3 text-foreground">
 {t("services.title")} <span className="gradient-text">{t("services.titleHighlight")}</span>
 </h2>
 <p className="text-muted-foreground mt-5 max-w-2xl mx-auto text-lg">
 {t("services.subtitle")}
 </p>
 </div>

 {/* Mobile: simple stack */}
 <div className="flex flex-col gap-5 lg:hidden">
 {services.map((s) => (
 <ServiceCard key={s.title} s={s} />
 ))}
 <div className="relative group overflow-hidden rounded-2xl">
 <img src={servicesImage} alt="Équipe CloudMature accompagnant un client en transformation Cloud et DevOps"className="w-full h-64 object-cover rounded-2xl"/>
 <div className="absolute inset-0 bg-secondary/60 rounded-2xl"/>
 <div className="absolute bottom-0 left-0 right-0 p-6">
 <p className="text-sm font-semibold uppercase tracking-wider text-primary">Cloud Mature</p>
 <p className="text-lg font-bold text-primary-foreground mt-1">{t("services.imageCaption")}</p>
 </div>
 </div>
 </div>

 {/* Desktop: wrapped layout */}
 <div className="hidden lg:flex flex-col gap-6">
 {firstFull && (
 <div className="grid grid-cols-3 gap-6">
 <div className="col-span-3">
 <ServiceCard s={firstFull} />
 </div>
 </div>
 )}
 <div className="grid grid-cols-3 gap-6">
 {topRow.map((s) => (
 <ServiceCard key={s.title} s={s} />
 ))}
 </div>

 <div className="grid grid-cols-3 gap-6">
 {middleLeft.map((s) => (
 <ServiceCard key={s.title} s={s} />
 ))}
 <div className="relative group overflow-hidden rounded-2xl">
 <div className="absolute -inset-1 rounded-2xl bg-primary blur-lg opacity-60 group-hover:opacity-90 transition-opacity duration-500"/>
 <div className="relative overflow-hidden rounded-2xl h-full border border-primary/20">
 <img src={servicesImage} alt="Consultants CloudMature en session de travail sur un projet Cloud et IA"className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
 <div className="absolute inset-0 bg-primary to-transparent"/>
 <div className="absolute bottom-0 left-0 right-0 p-6">
 <p className="text-sm font-semibold uppercase tracking-wider text-primary">Cloud Mature</p>
 <p className="text-lg font-bold text-primary-foreground mt-1">{t("services.imageCaption")}</p>
 </div>
 </div>
 </div>
 {middleRight.map((s) => (
 <ServiceCard key={s.title} s={s} />
 ))}
 </div>

 <div className="grid grid-cols-3 gap-6">
 {bottomRow.map((s, i) => (
 <div key={s.title} className={i === bottomRow.length - 1 && (bottomRow.length % 3 === 1) ?"col-span-3":""}>
 <ServiceCard s={s} />
 </div>
 ))}
 </div>
 </div>
 </div>
 </section>
 );
}
