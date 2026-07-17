import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, Loader2, Sparkles } from "lucide-react";

interface XpEvent {
  id: string;
  event_type: string;
  xp: number;
  created_at: string;
  metadata: any;
  training_id: string | null;
}

const EVENT_LABELS: Record<string, string> = {
  quiz_passed: "QCM réussi",
  quiz_perfect: "Score parfait",
  training_completed: "Formation terminée",
  daily_login: "Connexion quotidienne",
  streak_bonus: "Bonus de série",
  badge_earned: "Badge débloqué",
  comment_posted: "Commentaire publié",
};

export function XpHistoryFeed({ userId }: { userId: string }) {
  const [events, setEvents] = useState<XpEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("learner_xp_events")
        .select("id, event_type, xp, created_at, metadata, training_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8);
      if (cancelled) return;
      setEvents((data || []) as XpEvent[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="rounded-lg bg-white border p-3">
      <div className="text-xs font-semibold flex items-center gap-1 mb-2">
        <History className="h-3.5 w-3.5 text-primary" /> Historique XP récent
      </div>
      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Aucune activité XP pour le moment.</p>
      ) : (
        <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-xs">
              <Sparkles className="h-3 w-3 text-amber-500 flex-shrink-0" />
              <span className="flex-1 truncate">{EVENT_LABELS[e.event_type] || e.event_type}</span>
              <span className="text-muted-foreground text-[10px]">
                {new Date(e.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
              </span>
              <span className="font-semibold text-primary">+{e.xp}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
