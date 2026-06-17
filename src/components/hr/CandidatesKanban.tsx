import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, GripVertical, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type AppStatus = "nouvelle" | "en_revue" | "entretien" | "acceptee" | "refusee";

interface KanbanApp {
  id: string;
  full_name: string;
  email: string;
  status: AppStatus;
  job_id: string;
  created_at: string;
  ai_score?: number | null;
  ai_match_percentage?: number | null;
}

interface KanbanJob { id: string; title: string }

interface Props {
  applications: KanbanApp[];
  jobs: KanbanJob[];
  onMove: (appId: string, newStatus: AppStatus) => void;
  onOpenDetail: (appId: string) => void;
}

const COLUMNS: { key: AppStatus; label: string; ring: string; head: string }[] = [
  { key: "nouvelle",  label: "Nouvelles",  ring: "ring-blue-500/30",    head: "text-blue-600 bg-blue-500/10" },
  { key: "en_revue",  label: "En revue",   ring: "ring-amber-500/30",   head: "text-amber-600 bg-amber-500/10" },
  { key: "entretien", label: "Entretien",  ring: "ring-purple-500/30",  head: "text-purple-600 bg-purple-500/10" },
  { key: "acceptee",  label: "Acceptées",  ring: "ring-emerald-500/30", head: "text-emerald-600 bg-emerald-500/10" },
  { key: "refusee",   label: "Refusées",   ring: "ring-rose-500/30",    head: "text-rose-600 bg-rose-500/10" },
];

export default function CandidatesKanban({ applications, jobs, onMove, onOpenDetail }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<AppStatus | null>(null);
  const jobTitle = (id: string) => jobs.find(j => j.id === id)?.title || "Offre supprimée";

  const grouped = useMemo(() => {
    const map = new Map<AppStatus, KanbanApp[]>();
    COLUMNS.forEach(c => map.set(c.key, []));
    applications.forEach(a => map.get(a.status)?.push(a));
    return map;
  }, [applications]);

  const handleDrop = (status: AppStatus) => {
    if (dragId) {
      const current = applications.find(a => a.id === dragId);
      if (current && current.status !== status) onMove(dragId, status);
    }
    setDragId(null);
    setOverCol(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {COLUMNS.map(col => {
        const items = grouped.get(col.key) || [];
        const isOver = overCol === col.key;
        return (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col.key); }}
            onDragLeave={() => setOverCol((v) => v === col.key ? null : v)}
            onDrop={() => handleDrop(col.key)}
            className={cn(
              "rounded-xl border bg-card/40 backdrop-blur-sm p-2 min-h-[300px] transition-all",
              isOver && `ring-2 ${col.ring} bg-card/70`,
            )}
          >
            <div className={cn("flex items-center justify-between gap-2 px-2 py-2 rounded-lg mb-2", col.head)}>
              <span className="text-xs font-semibold uppercase tracking-wide">{col.label}</span>
              <Badge variant="secondary" className="bg-white/60 text-foreground">{items.length}</Badge>
            </div>
            <div className="space-y-2">
              {items.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-6 italic">Vide</p>
              )}
              {items.map(app => (
                <Card
                  key={app.id}
                  draggable
                  onDragStart={() => setDragId(app.id)}
                  onDragEnd={() => { setDragId(null); setOverCol(null); }}
                  onClick={() => onOpenDetail(app.id)}
                  className={cn(
                    "p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 hover:shadow-md transition-all group",
                    dragId === app.id && "opacity-50",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical size={14} className="text-muted-foreground/60 mt-0.5 shrink-0 group-hover:text-primary transition-colors" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{app.full_name}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 min-w-0">
                        <Briefcase size={10} className="shrink-0" />
                        <span className="truncate">{jobTitle(app.job_id)}</span>
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(app.created_at), "dd/MM")}
                        </span>
                        {app.ai_score != null && (
                          <Badge variant="outline" className="h-5 px-1.5 gap-1 text-[10px]">
                            <Sparkles size={9} className="text-primary" /> {app.ai_score}/100
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
