import { describe, it, expect } from "vitest";
import { computeJobStats, type StatApp } from "@/lib/recruitment-stats";

const app = (status: StatApp["status"], created_at: string, m: number | null = null): StatApp => ({ status, created_at, ai_match_percentage: m });
const now = new Date("2026-10-15T12:00:00Z");

describe("computeJobStats", () => {
  it("taux de pourvoi = acceptées / candidats recherchés, plafonné à 100", () => {
    const apps = [app("acceptee", "2026-10-10"), app("refusee", "2026-10-10")];
    expect(computeJobStats(apps, 2, 14, now).fillRate).toBe(50);
    expect(computeJobStats([...apps, app("acceptee", "2026-10-11"), app("acceptee", "2026-10-11")], 2, 14, now).fillRate).toBe(100);
  });

  it("adéquation moyenne ignore les candidatures non analysées", () => {
    const s = computeJobStats([app("nouvelle", "2026-10-15", 80), app("nouvelle", "2026-10-15", 60), app("nouvelle", "2026-10-15")], 1, 14, now);
    expect(s.avgMatch).toBe(70);
    expect(s.analyzed).toBe(2);
    expect(s.pending).toBe(3);
  });

  it("aucune analyse → null, pas 0", () => {
    expect(computeJobStats([app("nouvelle", "2026-10-15")], 1, 14, now).avgMatch).toBeNull();
  });

  it("taux d'entretien compte entretien + acceptée", () => {
    const s = computeJobStats([app("entretien", "2026-10-15"), app("acceptee", "2026-10-15"), app("refusee", "2026-10-15"), app("nouvelle", "2026-10-15")], 1, 14, now);
    expect(s.interviewRate).toBe(50);
  });

  it("courbe journalière sur 14 jours, aujourd'hui en dernier", () => {
    const s = computeJobStats([app("nouvelle", "2026-10-15T08:00:00Z"), app("nouvelle", "2026-10-15T09:00:00Z"), app("nouvelle", "2026-09-01")], 1, 14, now);
    expect(s.daily).toHaveLength(14);
    expect(s.daily[13]).toEqual({ date: "2026-10-15", count: 2 });
    expect(s.daily.reduce((n, d) => n + d.count, 0)).toBe(2);
  });
});
