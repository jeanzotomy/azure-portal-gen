import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ViewMode = "table" | "cards";

export function useViewMode(key: string, defaultMode: ViewMode = "table"): [ViewMode, (m: ViewMode) => void] {
  const storageKey = `view-mode:${key}`;
  const [mode, setModeState] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return defaultMode;
    const saved = window.localStorage.getItem(storageKey);
    return saved === "cards" || saved === "table" ? (saved as ViewMode) : defaultMode;
  });
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(storageKey, mode);
  }, [mode, storageKey]);
  return [mode, setModeState];
}

interface Props {
  value: ViewMode;
  onChange: (m: ViewMode) => void;
  className?: string;
}

export function ViewModeToggle({ value, onChange, className }: Props) {
  return (
    <div className={cn("inline-flex rounded-md border border-border overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={cn(
          "px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1 transition-colors",
          value === "table" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted",
        )}
        aria-label="Vue tableau"
        title="Vue tableau"
      >
        <TableIcon size={13} /> Tableau
      </button>
      <button
        type="button"
        onClick={() => onChange("cards")}
        className={cn(
          "px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1 transition-colors border-l border-border",
          value === "cards" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted",
        )}
        aria-label="Vue cartes"
        title="Vue cartes"
      >
        <LayoutGrid size={13} /> Cartes
      </button>
    </div>
  );
}
