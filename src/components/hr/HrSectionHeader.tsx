import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  count?: number;
  onRefresh?: () => void;
  right?: ReactNode;
}

/** En-tête harmonisé pour les sections RH : icône + titre + compteur + actions, aéré. */
export default function HrSectionHeader({ icon, title, description, count, onRefresh, right }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
      <div className="flex items-start gap-3 min-w-0">
        <div className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight flex items-center gap-2 flex-wrap">
            <span className="truncate">{title}</span>
            {typeof count === "number" && (
              <span className="text-muted-foreground font-normal text-sm">({count})</span>
            )}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap sm:justify-end shrink-0">
        {right}
        {onRefresh && (
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-1.5" />Actualiser
          </Button>
        )}
      </div>
    </div>
  );
}
