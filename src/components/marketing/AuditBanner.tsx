import logo from "@/assets/cloudmature-logo.png";
import heroPerson from "@/assets/hero-person.webp";
import { CalendarClock, TrendingUp, Users, Mail, Phone, Globe } from "lucide-react";

/** Microsoft four-square mark, rebuilt in CSS (no external asset). */
const MicrosoftMark = ({ size = 22 }: { size?: number }) => (
  <span
    className="inline-grid shrink-0 grid-cols-2 gap-[2px]"
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <span className="rounded-[1px] bg-ms-red" />
    <span className="rounded-[1px] bg-ms-green" />
    <span className="rounded-[1px] bg-ms-blue" />
    <span className="rounded-[1px] bg-ms-yellow" />
  </span>
);

const FloatingApp = ({
  label,
  className,
}: { label: string; className?: string }) => (
  <span
    aria-hidden="true"
    className={`absolute flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-bold text-primary-foreground shadow-lg ${className ?? ""}`}
  >
    {label}
  </span>
);


const benefits = [
  { icon: CalendarClock, label: "Vérification des échéances" },
  { icon: TrendingUp, label: "Optimisation des coûts" },
  { icon: Users, label: "Licences adaptées à vos besoins" },
];

export function AuditBanner() {
  return (
    <section
      aria-label="Audit gratuit de vos licences Microsoft"
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-white via-[hsl(200_100%_98%)] to-[hsl(200_90%_94%)] shadow-lg dark:from-card dark:via-card dark:to-secondary"
    >
      {/* Cloud watermark */}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 120"
        className="pointer-events-none absolute -left-8 bottom-0 h-48 w-auto text-primary/[0.06]"
        fill="currentColor"
      >
        <path d="M50 95a30 30 0 0 1-2-59.8A38 38 0 0 1 120 28a26 26 0 0 1 34 24 22 22 0 0 1-6 43H50Z" />
      </svg>

      {/* Floating Microsoft app pictograms */}
      <div className="pointer-events-none absolute right-4 top-4 hidden h-28 w-40 sm:block">
        <FloatingApp label="W" color="hsl(213 74% 40%)" className="left-0 top-2 animate-float" />
        <FloatingApp label="X" color="hsl(150 70% 30%)" className="left-14 top-10 animate-float [animation-delay:1s]" />
        <FloatingApp label="T" color="hsl(250 45% 50%)" className="left-28 top-0 animate-float [animation-delay:2s]" />
      </div>

      <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
        <div className="min-w-0">
          {/* Logo + baseline */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="Cloud Mature" className="h-10 w-10" width={40} height={40} />
            <div>
              <p className="text-base font-extrabold leading-none text-secondary dark:text-foreground">
                Cloud Mature
              </p>
              <p className="mt-1 text-[11px] font-medium tracking-wide text-primary">
                Innover • Optimiser • Automatiser
              </p>
            </div>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold leading-[1.1] text-secondary dark:text-foreground sm:text-4xl lg:text-5xl">
            Vos licences <span className="text-primary">Microsoft</span> expirent dans moins de{" "}
            <span className="text-primary">6</span> mois ?
          </h1>
          <p className="mt-3 text-lg font-semibold text-muted-foreground sm:text-xl">
            Anticipez votre renouvellement.
          </p>

          <div className="mt-5 inline-flex items-center gap-3 rounded-full bg-secondary px-5 py-2.5 shadow-md">
            <MicrosoftMark />
            <span className="text-sm font-extrabold uppercase tracking-wider text-white sm:text-base">
              Audit gratuit
            </span>
          </div>

          <ul className="mt-6 space-y-3">
            {benefits.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-foreground sm:text-base">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Photo: visible on large screens, faded background on mobile */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] lg:hidden">
          <img src={heroPerson} alt="" aria-hidden="true" className="h-full w-full object-cover" />
        </div>
        <div className="relative hidden lg:block">
          <img
            src={heroPerson}
            alt="Un responsable informatique travaille sur son ordinateur portable dans un bureau lumineux"
            className="h-full w-full rounded-xl object-cover object-center shadow-md"
            loading="lazy"
          />
        </div>
      </div>

      {/* Footer band */}
      <div className="relative flex flex-wrap items-center justify-center gap-x-6 gap-y-2 bg-secondary px-5 py-3 text-xs text-white/90 sm:text-sm">
        <a href="tel:+224626441150" className="flex items-center gap-2 hover:text-white">
          <Phone size={14} aria-hidden="true" /> +224 626 441 150
        </a>
        <a href="mailto:info@cloudmature.com" className="flex items-center gap-2 hover:text-white">
          <Mail size={14} aria-hidden="true" /> info@cloudmature.com
        </a>
        <a
          href="https://www.cloudmature.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 hover:text-white"
        >
          <Globe size={14} aria-hidden="true" /> www.cloudmature.com
        </a>
      </div>
    </section>
  );
}

export default AuditBanner;
