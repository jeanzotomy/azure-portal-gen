import { ArrowRight, Cloud, Shield, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

export function HeroSection() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/90 via-secondary/80 to-secondary/95" />

      <div className="container relative z-10 py-32">
        <div className="max-w-3xl animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-sm text-cyan-glow">
            <Cloud size={16} />
            Consultation TI · Cloud · DevOps
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-primary-foreground mb-6">
            Innover.{" "}
            <span className="gradient-text">Optimiser.</span>{" "}
            Automatiser.
          </h1>
          <p className="text-lg md:text-xl text-secondary-foreground/70 max-w-2xl mb-8">
            Cloud Mature accompagne les organisations dans leur transformation vers le Cloud avec une approche sécurisée, performante et conforme aux standards les plus élevés.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="gradient-primary text-primary-foreground border-0 hover:opacity-90 animate-pulse-glow"
              onClick={() => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })}>
              Demander une consultation <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="border-primary/40 text-primary-foreground hover:bg-primary/10"
              onClick={() => document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" })}>
              Nos services
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 animate-fade-up delay-300">
          {[
            { icon: Cloud, title: "Multi-Cloud", desc: "AWS, Azure, GCP" },
            { icon: Shield, title: "Sécurité", desc: "ISO 27001, SOC 2, RGPD" },
            { icon: TrendingUp, title: "FinOps", desc: "Optimisation des coûts" },
          ].map((item) => (
            <div key={item.title} className="glass rounded-xl p-6 flex items-center gap-4 hover:scale-[1.02] transition-transform">
              <div className="p-3 rounded-lg gradient-primary">
                <item.icon size={24} className="text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-foreground">{item.title}</h3>
                <p className="text-sm text-secondary-foreground/60">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
