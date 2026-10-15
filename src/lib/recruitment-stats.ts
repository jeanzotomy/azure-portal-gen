export type AppStatus = "nouvelle" | "en_revue" | "entretien" | "acceptee" | "refusee";

export interface StatApp {
  status: AppStatus;
  created_at: string;
  ai_match_percentage: number | null;
}

export interface JobStats {
  total: number;
  byStatus: Record<AppStatus, number>;
  /** Candidatures pas encore traitées (statut « nouvelle »). */
  pending: number;
  /** Postes pourvus / candidats recherchés, en % (0–100, plafonné). */
  fillRate: number;
  /** Moyenne d'adéquation IA sur les candidatures analysées, null si aucune. */
  avgMatch: number | null;
  analyzed: number;
  /** Part des candidatures arrivées en entretien ou au-delà (acceptée), en %. */
  interviewRate: number;
  /** Nombre de candidatures par jour sur les `days` derniers jours (plus ancien d'abord). */
  daily: { date: string; count: number }[];
}

const EMPTY: Record<AppStatus, number> = { nouvelle: 0, en_revue: 0, entretien: 0, acceptee: 0, refusee: 0 };

export function computeJobStats(apps: StatApp[], sought: number, days = 14, now = new Date()): JobStats {
  const byStatus = { ...EMPTY };
  let matchSum = 0;
  let analyzed = 0;
  for (const a of apps) {
    if (a.status in byStatus) byStatus[a.status]++;
    if (a.ai_match_percentage != null) { matchSum += a.ai_match_percentage; analyzed++; }
  }
  const total = apps.length;
  const target = Math.max(1, sought || 1);

  const daily: { date: string; count: number }[] = [];
  const counts = new Map<string, number>();
  for (const a of apps) {
    const k = a.created_at.slice(0, 10);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const k = d.toISOString().slice(0, 10);
    daily.push({ date: k, count: counts.get(k) ?? 0 });
  }

  return {
    total,
    byStatus,
    pending: byStatus.nouvelle,
    fillRate: Math.min(100, Math.round((byStatus.acceptee / target) * 100)),
    avgMatch: analyzed ? Math.round(matchSum / analyzed) : null,
    analyzed,
    interviewRate: total ? Math.round(((byStatus.entretien + byStatus.acceptee) / total) * 100) : 0,
    daily,
  };
}
