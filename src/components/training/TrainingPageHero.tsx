import { ReactNode } from "react";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Crumb = { label: string; to?: string };

interface TrainingPageHeroProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  backTo?: string;
}

/**
 * Navy Trust hero header for all training pages (Admin / HR / User).
 * Uses CloudMature primary gradient + glassmorphism overlay.
 */
export function TrainingPageHero({
  title,
  subtitle,
  icon,
  breadcrumbs,
  actions,
  backTo,
}: TrainingPageHeroProps) {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f1b3d] via-[#1e3a5f] to-[#0099cc] text-white shadow-xl">
      {/* Glass orbs decoration */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />

      <div className="relative p-5 md:p-7">
        {(backTo || breadcrumbs?.length) && (
          <div className="flex items-center gap-2 mb-3 text-xs text-white/80">
            {backTo && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(backTo)}
                className="text-white hover:bg-white/10 -ml-2 h-7 px-2"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Retour
              </Button>
            )}
            {breadcrumbs?.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
                {c.to ? (
                  <Link to={c.to} className="hover:text-white underline-offset-2 hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-white/90">{c.label}</span>
                )}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur border border-white/20">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-sm text-white/80 mt-1 max-w-2xl">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
