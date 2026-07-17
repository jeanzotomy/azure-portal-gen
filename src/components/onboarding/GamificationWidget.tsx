import { useEffect, useState } from"react";
import { supabase } from"@/integrations/supabase/client";
import { Trophy, Flame, Sparkles, Star, RefreshCw } from"lucide-react";
import { Button } from"@/components/ui/button";
import { XpHistoryFeed } from"@/components/onboarding/XpHistoryFeed";

interface Gamif {
 xp: number;
 level: number;
 streak_days: number;
 longest_streak: number;
}

interface Badge {
 id: string;
 badge_code: string;
 badge_label: string;
 badge_icon: string | null;
 earned_at: string;
}

interface LeaderRow {
 user_id: string;
 xp: number;
 level: number;
 full_name: string | null;
}

const XP_PER_LEVEL = 200;

export function GamificationWidget({ userId, refreshKey = 0 }: { userId: string; refreshKey?: number }) {
 const [gamif, setGamif] = useState<Gamif | null>(null);
 const [badges, setBadges] = useState<Badge[]>([]);
 const [leaders, setLeaders] = useState<LeaderRow[]>([]);
 const [loading, setLoading] = useState(true);
 const [internalKey, setInternalKey] = useState(0);

 useEffect(() => {
 let cancelled = false;
 (async () => {
 setLoading(true);
 const [{ data: g }, { data: b }, { data: top }] = await Promise.all([
 (supabase.from("candidate_gamification") as any).select("xp, level, streak_days, longest_streak").eq("user_id", userId).maybeSingle(),
 (supabase.from("candidate_badges") as any).select("id, badge_code, badge_label, badge_icon, earned_at").eq("user_id", userId).order("earned_at", { ascending: false }),
 (supabase.from("candidate_gamification") as any).select("user_id, xp, level").order("xp", { ascending: false }).limit(5),
 ]);
 if (cancelled) return;
 setGamif(g ?? { xp: 0, level: 1, streak_days: 0, longest_streak: 0 });
 setBadges(b ?? []);

 // Resolve display names for leaderboard (anonymized to initials)
 const userIds = (top ?? []).map((r: any) => r.user_id);
 let names: Record<string, string> = {};
 if (userIds.length) {
 const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
 (profs ?? []).forEach((p: any) => { names[p.user_id] = p.full_name ??""; });
 }
 setLeaders((top ?? []).map((r: any) => ({ ...r, full_name: names[r.user_id] ?? null })));
 setLoading(false);
 })();
 return () => { cancelled = true; };
 }, [userId, refreshKey, internalKey]);

 if (loading && !gamif) {
 return <div className="p-4 bg-white rounded-lg border text-xs text-muted-foreground">Chargement…</div>;
 }

 const xp = gamif?.xp ?? 0;
 const level = gamif?.level ?? 1;
 const xpInLevel = xp % XP_PER_LEVEL;
 const xpProgress = Math.round((xpInLevel / XP_PER_LEVEL) * 100);

 const anonymize = (name: string | null, uid: string) => {
 if (uid === userId) return"Vous";
 if (!name) return"Candidat";
 const parts = name.trim().split(/\s+/);
 return parts.map(p => p[0]?.toUpperCase() ??"").join("").slice(0, 3) ||"C";
 };

 return (
 <div className="rounded-xl border bg-primary via-white overflow-hidden">
 <div className="bg-gradient-primary-deep text-primary-foreground px-4 py-2.5 flex items-center justify-between">
 <div className="flex items-center gap-2 text-white">
 <Sparkles className="h-4 w-4"/>
 <span className="font-semibold text-sm">Mon parcours d'apprentissage</span>
 </div>
 <Button variant="ghost"size="sm"className="h-7 text-white hover:bg-white/20"onClick={() => setInternalKey(k => k + 1)}>
 <RefreshCw className="h-3.5 w-3.5"/>
 </Button>
 </div>

 <div className="p-4 grid gap-4 md:grid-cols-3">
 {/* Level + XP */}
 <div className="md:col-span-2 space-y-3">
 <div className="flex items-center gap-3">
 <div className="h-14 w-14 rounded-full bg-amber-400/10 flex items-center justify-center text-white font-bold text-lg shadow-md">
 {level}
 </div>
 <div className="flex-1">
 <div className="text-xs text-muted-foreground">Niveau</div>
 <div className="font-semibold text-sm">Niveau {level} · {xp} XP</div>
 <div className="mt-1.5 h-2 bg-muted rounded-full overflow-hidden">
 <div className="h-full bg-amber-400/10 transition-all"style={{ width: `${xpProgress}%` }} />
 </div>
 <div className="text-[10px] text-muted-foreground mt-1">{xpInLevel}/{XP_PER_LEVEL} XP avant niveau {level + 1}</div>
 </div>
 </div>

 {/* Streak */}
 <div className="flex items-center gap-3 p-2.5 rounded-lg bg-orange-50 border border-orange-100">
 <Flame className={`h-7 w-7 ${(gamif?.streak_days ?? 0) > 0 ?"text-orange-500":"text-muted-foreground"}`} />
 <div className="flex-1">
 <div className="text-xs text-muted-foreground">Série quotidienne</div>
 <div className="font-semibold text-sm">{gamif?.streak_days ?? 0} jour{(gamif?.streak_days ?? 0) > 1 ?"s":""} d'affilée</div>
 </div>
 <div className="text-right text-[10px] text-muted-foreground">
 Record<br /><span className="font-semibold text-sm text-foreground">{gamif?.longest_streak ?? 0}j</span>
 </div>
 </div>

 {/* Badges */}
 <div>
 <div className="flex items-center justify-between mb-1.5">
 <div className="text-xs font-semibold flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500"/> Badges débloqués</div>
 <div className="text-[10px] text-muted-foreground">{badges.length}</div>
 </div>
 {badges.length === 0 ? (
 <div className="text-xs text-muted-foreground italic">Complétez votre premier QCM pour débloquer vos premiers badges 🎯</div>
 ) : (
 <div className="flex flex-wrap gap-1.5">
 {badges.map(b => (
 <div key={b.id} title={new Date(b.earned_at).toLocaleDateString("fr-FR")} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-amber-200 text-xs shadow-sm">
 <span className="text-base leading-none">{b.badge_icon ||"🏅"}</span>
 <span className="font-medium">{b.badge_label}</span>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Leaderboard */}
 <div className="rounded-lg bg-white border p-3">
 <div className="text-xs font-semibold flex items-center gap-1 mb-2"><Trophy className="h-3.5 w-3.5 text-amber-500"/> Classement (top 5)</div>
 {leaders.length === 0 ? (
 <div className="text-xs text-muted-foreground italic">Aucun candidat classé.</div>
 ) : (
 <ol className="space-y-1.5">
 {leaders.map((l, i) => {
 const me = l.user_id === userId;
 return (
 <li key={l.user_id} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${me ?"bg-primary/10 border border-primary/30":""}`}>
 <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ?"bg-amber-400 text-white": i === 1 ?"bg-slate-300 text-white": i === 2 ?"bg-orange-300 text-white":"bg-muted text-muted-foreground"}`}>{i + 1}</span>
 <span className={`flex-1 truncate ${me ?"font-semibold":""}`}>{anonymize(l.full_name, l.user_id)}</span>
 <span className="text-muted-foreground">N{l.level}</span>
 <span className="font-semibold">{l.xp}</span>
 </li>
 );
 })}
 </ol>
  )}
 </div>

 <div className="mt-3">
  <XpHistoryFeed userId={userId} />
 </div>
 </div>
 </div>
 );
}
