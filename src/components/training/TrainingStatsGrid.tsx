import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrainingStat {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: "primary" | "cyan" | "emerald" | "amber" | "violet";
}

const accents: Record<NonNullable<TrainingStat["accent"]>, string> = {
  primary: "from-primary/20 to-primary/5 text-primary",
  cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-600 dark:text-cyan-400",
  emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  amber: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400",
  violet: "from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-400",
};

interface TrainingStatsGridProps {
  stats: TrainingStat[];
  className?: string;
  children?: ReactNode;
}

export function TrainingStatsGrid({ stats, className, children }: TrainingStatsGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 lg:grid-cols-4 gap-3",
        className
      )}
    >
      {stats.map((s, i) => {
        const Icon = s.icon;
        const accent = accents[s.accent || "primary"];
        return (
          <div
            key={i}
            className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur p-3 transition hover:border-primary/40 hover:shadow-md"
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none", accent)} />
            <div className="relative flex items-center gap-3">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/80 border border-border/50", accent.split(" ").pop())}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground truncate">{s.label}</div>
                <div className="text-lg font-bold text-foreground leading-tight">
                  {s.value}
                </div>
                {s.hint && <div className="text-[10px] text-muted-foreground truncate">{s.hint}</div>}
              </div>
            </div>
          </div>
        );
      })}
      {children}
    </div>
  );
}
