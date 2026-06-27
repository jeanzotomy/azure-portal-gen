import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, Sparkles, Flame, Crown, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  fetchLeaderboard,
  fetchLearnerRank,
  LEAGUE_META,
  type LeaderboardRow,
  type LearnerRank,
} from "@/lib/learner-xp";
import { LearnerFollowButton } from "@/components/training/LearnerFollowButton";
import { useSeo } from "@/hooks/use-seo";

export default function LearnerLeaderboardPage() {
  const { user } = useAuthSession();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [me, setMe] = useState<LearnerRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useSeo({
    title: "Classement des apprenants | CloudMature",
    description: "Top 20 hebdomadaire des apprenants CloudMature et votre rang personnel.",
    path: "/portal/formations/classement",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [lb, rank] = await Promise.all([fetchLeaderboard(20), user ? fetchLearnerRank() : Promise.resolve(null)]);
        if (cancelled) return;
        setRows(lb);
        setMe(rank);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, refreshKey]);

  const myLeague = me ? LEAGUE_META[me.league] : null;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link to="/portal/formations">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Mes formations
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
          <RefreshCw className="h-4 w-4 mr-1.5" /> Actualiser
        </Button>
      </div>

      <div className="rounded-2xl overflow-hidden border bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="p-6 sm:p-8 flex items-center gap-4">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg">
            <Trophy className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">Classement des apprenants</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Top 20 hebdomadaire — gagnez de l'XP en complétant chapitres, quiz et certificats.
            </p>
          </div>
        </div>
      </div>

      {/* Mon rang */}
      {me && myLeague && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Mon profil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Stat icon={<Crown className="h-4 w-4" />} label="Rang hebdo" value={me.rank_week > 0 ? `#${me.rank_week}` : "—"} />
              <Stat icon={<Flame className="h-4 w-4" />} label="XP cette semaine" value={`${me.total_xp_week}`} />
              <Stat icon={<Trophy className="h-4 w-4" />} label="XP total" value={`${me.total_xp_alltime}`} />
              <div className={`rounded-xl p-3 bg-gradient-to-br ${myLeague.color} text-white shadow-sm`}>
                <div className="text-[10px] uppercase tracking-wider opacity-90">Ligue</div>
                <div className="font-bold text-lg flex items-center gap-1 mt-0.5">
                  <span>{myLeague.emoji}</span>
                  <span>{myLeague.label}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 20 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" /> Top 20 cette semaine
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">
              Aucun classement pour cette semaine. Complétez un quiz pour démarrer !
            </p>
          ) : (
            <ol className="space-y-1.5">
              {rows.map((r) => {
                const isMe = user?.id === r.user_id;
                const initials = r.full_name
                  .split(/\s+/)
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <li
                    key={r.user_id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                      isMe ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-muted/40 border-transparent"
                    }`}
                  >
                    <RankBadge rank={Number(r.rank)} />
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
                      {initials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        {r.full_name}
                        {isMe && (
                          <Badge variant="secondary" className="text-[10px] py-0">
                            Vous
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{r.total_xp}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">XP</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {(Object.entries(LEAGUE_META) as Array<[keyof typeof LEAGUE_META, (typeof LEAGUE_META)[keyof typeof LEAGUE_META]]>).map(
          ([key, l]) => (
            <div key={key} className={`rounded-xl p-3 bg-gradient-to-br ${l.color} text-white text-center shadow-sm`}>
              <div className="text-2xl">{l.emoji}</div>
              <div className="font-bold mt-1">{l.label}</div>
              <div className="text-[10px] opacity-90">≥ {l.threshold} XP</div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 bg-muted/40 border">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="font-bold text-lg mt-0.5">{value}</div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const base = "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0";
  if (rank === 1) return <span className={`${base} bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow`}>1</span>;
  if (rank === 2) return <span className={`${base} bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow`}>2</span>;
  if (rank === 3) return <span className={`${base} bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow`}>3</span>;
  return <span className={`${base} bg-muted text-muted-foreground`}>{rank}</span>;
}
