import { useEffect, useState } from "react";
import dashboard1 from "@/assets/dashboard-1.jpg";
import dashboard2 from "@/assets/dashboard-2.jpg";
import dashboard3 from "@/assets/dashboard-3.jpg";
import dashboard4 from "@/assets/dashboard-4.jpg";
import dashboardAutomation from "@/assets/dashboard-automation.jpg";
import dashboardMs365 from "@/assets/dashboard-ms365.jpg";
import dashboardIa from "@/assets/dashboard-ia.jpg";
import dashboardBi from "@/assets/dashboard-bi.jpg";

const slides = [
  { src: dashboard1, label: "Cloud Infrastructure" },
  { src: dashboard2, label: "Cybersécurité" },
  { src: dashboard3, label: "DevOps & CI/CD" },
  { src: dashboard4, label: "FinOps" },
  { src: dashboardAutomation, label: "Automation" },
  { src: dashboardMs365, label: "Microsoft 365" },
  { src: dashboardIa, label: "Intelligence Artificielle" },
  { src: dashboardBi, label: "Business Intelligence" },
];

export function HeroScreenCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mx-auto max-w-5xl animate-fade-up delay-500">
      {/* Glow behind monitor */}
      <div className="absolute -inset-8 bg-gradient-to-t from-primary/20 via-accent/10 to-transparent blur-3xl rounded-3xl opacity-60" />

      {/* Monitor frame */}
      <div className="relative rounded-2xl border-2 border-white/20">
        {/* Top bezel */}
        <div className="bg-secondary rounded-t-2xl px-6 py-3 flex items-center gap-2 relative z-10">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
        </div>

        {/* Screen area */}
        <div className="relative bg-secondary overflow-hidden aspect-[16/9] rounded-b-lg border-x-4 border-b-4 border-secondary">
          {slides.map((slide, i) => (
            <img
              key={i}
              src={slide.src}
              alt={slide.label}
              loading="lazy"
              width={1280}
              height={720}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${
                i === current
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-105"
              }`}
            />
          ))}

          {/* Slide label */}
          <div className="absolute bottom-4 left-4 z-10">
            <span className="bg-secondary/80 backdrop-blur-sm text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full border border-primary/30">
              {slides[current].label}
            </span>
          </div>
        </div>

        {/* Monitor stand */}
        <div className="flex justify-center relative z-10">
          <div className="w-24 h-6 bg-gradient-to-b from-muted-foreground/30 to-muted-foreground/10 rounded-b-lg" />
        </div>
        <div className="flex justify-center relative z-10">
          <div className="w-40 h-2 bg-muted-foreground/20 rounded-full" />
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-2 mt-6">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all duration-500 ${
              i === current
                ? "w-8 bg-primary"
                : "w-2 bg-primary/30 hover:bg-primary/50"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
