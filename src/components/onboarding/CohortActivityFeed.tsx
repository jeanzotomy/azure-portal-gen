import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Activity, GraduationCap, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Item {
  kind: string;
  user_id: string;
  display_name: string;
  detail: string;
  emoji: string;
  happened_at: string;
}

const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "à l'instant";
  if (d < 3600) return `il y a ${Math.floor(d / 60)} min`;
  if (d < 86400) return `il y a ${Math.floor(d / 3600)} h`;
  return `il y a ${Math.floor(d / 86400)} j`;
};

const initials = (n: string) =>
  n.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

export function CohortActivityFeed() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_cohort_activity" as any, { _limit: 20 });
      if (active) {
        setItems((data as any) || []);
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">Fil d'activité de la cohorte</span>
        <Badge variant="outline" className="text-[10px]">en direct</Badge>
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">Pas encore d'activité — sois le premier à terminer une formation !</div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {items.map((it, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {initials(it.display_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div>
                  <span className="font-semibold">{it.display_name}</span>{" "}
                  {it.kind === "training_completed" ? (
                    <span className="text-muted-foreground">a terminé la formation</span>
                  ) : (
                    <span className="text-muted-foreground">a débloqué le badge</span>
                  )}{" "}
                  <span className="font-medium">{it.detail}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{timeAgo(it.happened_at)}</div>
              </div>
              <span className="text-base flex-shrink-0" title={it.kind}>{it.emoji}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
