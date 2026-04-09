import { ArrowRight, Cloud, Shield, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import heroPerson from "@/assets/hero-person.png";


export function HeroSection() {
  const words = ["Innover.", "Optimiser.", "Automatiser."];
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timers = words.map((_, i) =>
      setTimeout(() => setVisibleCount(i + 1), 400 + i * 500)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 gradient-hero" />

      <div className="container relative z-10 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass mb-6 text-sm font-medium tracking-wide border border-cyan-glow/30 shadow-[0_0_15px_hsl(195_100%_40%/0.15)] animate-pulse-glow">
              <Cloud size={16} className="text-cyan-glow" />
              <span className="text-cyan-glow">Consultation TI</span>
              <span className="text-secondary-foreground/40">·</span>
              <span className="text-cyan-glow">Cloud</span>
              <span className="text-secondary-foreground/40">·</span>
              <span className="text-cyan-glow">DevOps</span>
              <span className="text-secondary-foreground/40">·</span>
              <span className="gradient-text font-semibold">IA</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-primary-foreground mb-6">
              {words.map((word, i) => (
                <span
                  key={word}
                  className={`inline-block transition-all duration-700 ${
                    i === 1 ? "gradient-text" : ""
                  } ${
                    i < visibleCount
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  }`}
                >
                  {word}{" "}
                </span>
              ))}
            </h1>
            <p className="text-lg md:text-xl text-secondary-foreground/70 max-w-2xl mb-8">
              Cloud Mature accompagne les organisations dans leur transformation vers le Cloud avec une approche sécurisée, performante et conforme aux standards les plus élevés.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="gradient-primary text-primary-foreground border-0 hover:opacity-90 animate-pulse-glow"
                onClick={() => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })}>
                Demander une consultation <ArrowRight size={18} className="ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-cyan-glow/50 text-cyan-glow hover:bg-cyan-glow/10"
                onClick={() => document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" })}>
                Nos services
              </Button>
            </div>
          </div>

          <div className="hidden lg:flex justify-center animate-fade-up">
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/40 via-accent/30 to-primary/20 blur-xl opacity-60" />
              <img src={heroPerson} alt="Consultante Cloud Mature" className="relative max-h-[600px] w-auto rounded-2xl shadow-[0_20px_60px_-15px_hsl(195_100%_40%/0.3)] ring-1 ring-white/10" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 -mt-8 animate-fade-up delay-300">
          {[
            { icon: Cloud, title: "Multi-Cloud", desc: "AWS, Azure, GCP" },
            { icon: Shield, title: "Sécurité", desc: "ISO 27001, SOC 2" },
            { icon: TrendingUp, title: "FinOps", desc: "Optimisation coûts" },
          ].map((item) => (
            <div key={item.title} className="glass rounded-lg px-4 py-2.5 flex items-center gap-3 hover:scale-[1.02] transition-transform">
              <div className="p-2 rounded-md gradient-primary">
                <item.icon size={16} className="text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-primary-foreground">{item.title}</h3>
                <p className="text-xs text-secondary-foreground/60">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
