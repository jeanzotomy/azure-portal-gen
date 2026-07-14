import { supabase } from "@/integrations/supabase/client";

export type LearnerEventType =
  | "chapter_completed"
  | "quiz_passed"
  | "quiz_perfect"
  | "certificate_earned"
  | "comment_helpful"
  | "daily_streak"
  | "training_completed";

export type LearnerLeague = "bronze" | "argent" | "or" | "platine";

export interface LeaderboardRow {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_xp: number;
  rank: number;
}

export interface LearnerRank {
  total_xp_week: number;
  total_xp_alltime: number;
  rank_week: number;
  league: LearnerLeague;
}

const DEFAULT_XP: Record<LearnerEventType, number> = {
  chapter_completed: 20,
  quiz_passed: 50,
  quiz_perfect: 100,
  certificate_earned: 200,
  comment_helpful: 10,
  daily_streak: 30,
  training_completed: 150,
};

/**
 * Award XP server-side. Silently ignores failures (best-effort gamification).
 */
export async function awardLearnerXp(
  eventType: LearnerEventType,
  opts: { xp?: number; trainingId?: string; metadata?: Record<string, unknown> } = {}
): Promise<string | null> {
  try {
    const { data, error } = await (supabase.rpc as any)("award_learner_xp", {
      _event_type: eventType,
      _xp: opts.xp ?? DEFAULT_XP[eventType],
      _training_id: opts.trainingId ?? null,
      _metadata: opts.metadata ?? null,
    });
    if (error) {
      console.warn("[awardLearnerXp]", error.message);
      return null;
    }
    return (data as string) ?? null;
  } catch (e) {
    console.warn("[awardLearnerXp] exception", e);
    return null;
  }
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardRow[]> {
  const { data, error } = await (supabase.rpc as any)("get_learner_leaderboard", { _limit: limit });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}

export async function fetchLearnerRank(): Promise<LearnerRank | null> {
  const { data, error } = await (supabase.rpc as any)("get_learner_rank");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as LearnerRank) ?? null;
}

export const LEAGUE_META: Record<LearnerLeague, { label: string; color: string; emoji: string; threshold: number }> = {
  bronze: { label: "Bronze", color: "bg-amber-700", emoji: "🥉", threshold: 0 },
  argent: { label: "Argent", color: "bg-slate-400", emoji: "🥈", threshold: 500 },
  or: { label: "Or", color: "bg-amber-400", emoji: "🥇", threshold: 2000 },
  platine: { label: "Platine", color: "bg-cyan-500", emoji: "💎", threshold: 5000 },
};
