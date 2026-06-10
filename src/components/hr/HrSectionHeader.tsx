import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Props {
  icon: ReactNode;
  title: string;
  count?: number;
  onRefresh?: () => void;
  right?: ReactNode;
}

/** En-tête harmonisé pour les sections RH : icône + titre + compteur + actions. */
export default function HrSectionHeader({ icon, title, count, onRefresh, right }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="font-semibold">
          {title}
          {typeof count === "number" && (
            <span className="text-muted-foreground font-normal"> ({count})</span>
          )}
        </h3>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {right}
        {onRefresh && (
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />Actualiser
          </Button>
        )}
      </div>
    </div>
  );
}
