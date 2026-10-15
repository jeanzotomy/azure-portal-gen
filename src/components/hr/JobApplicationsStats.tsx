import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Inbox, Users, Target, Sparkles, CalendarCheck, RefreshCw, ChevronRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { computeJobStats, type AppStatus } from "@/lib/recruitment-stats";

const STATUS_LABEL: Record<AppStatus, string> = {
  nouvelle: "À traiter", en_revue: "En revue", entretien: "Entretien", acceptee: "Acceptée", refusee: "Refusée",
};
const STATUS_BAR: Record<AppStatus, string> = {
  nouvelle: "bg-primary", en_revue: "bg-amber-500", entretien: "bg-purple-500", acceptee: "bg-emerald-500", refusee: "bg-rose-500",
};

interface Row {
  id: string; full_name: string; email: string; status: AppStatus; created_at: string;
  ai_match_percentage: number | null;
}

export default function JobApplicationsStats({ jobId, sought }: { jobId: string; sought: number }) {
  const location = useLocation();
  const base = location.pathname.startsWith("/admin") ? "/admin" : "/rh";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AppStatus | "all">("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("job_applications")
      .select("id, full_name, email, status, created_at, ai_match_percentage")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    setRows((data || []) as Row[]);
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [jobId]);

  const stats = useMemo(() => computeJobStats(rows, sought), [rows, sought]);
  const maxDay = Math.max(1, ...stats.daily.map((d) => d.count));
  const shown = useMemo(() => {
    const list = filter === "all" ? rows : rows.filter((r) => r.status === filter);
    // Meilleure adéquation d'abord, puis plus récentes.
    return [...list].sort((a, b) => (b.ai_match_percentage ?? -1) - (a.ai_match_percentage ?? -1));
  }, [rows, filter]);

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold flex items-center gap-2"><Inbox size={16} className="text-primary" /> Candidatures reçues</h2>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<Users size={14} />} label="Candidatures" value={String(stats.total)} hint={`${stats.pending} à traiter`} />
        <Kpi icon={<Target size={14} />} label="Postes pourvus" value={`${stats.byStatus.acceptee} / ${Math.max(1, sought)}`} hint={`${stats.fillRate} %`} />
        <Kpi icon={<CalendarCheck size={14} />} label="Taux d'entretien" value={`${stats.interviewRate} %`} hint={`${stats.byStatus.entretien} en entretien`} />
        <Kpi icon={<Sparkles size={14} />} label="Adéquation moyenne" value={stats.avgMatch == null ? "—" : `${stats.avgMatch} %`} hint={`${stats.analyzed} CV analysé(s)`} />
      </div>

      {stats.total > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Répartition par étape</div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
            {(Object.keys(STATUS_LABEL) as AppStatus[]).map((s) => stats.byStatus[s] > 0 && (
              <div key={s} className={STATUS_BAR[s]} style={{ width: `${(stats.byStatus[s] / stats.total) * 100}%` }} title={`${STATUS_LABEL[s]} : ${stats.byStatus[s]}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>Toutes ({stats.total})</FilterChip>
            {(Object.keys(STATUS_LABEL) as AppStatus[]).map((s) => (
              <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)} dot={STATUS_BAR[s]}>
                {STATUS_LABEL[s]} ({stats.byStatus[s]})
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">Soumissions sur 14 jours</div>
        <div className="flex items-end gap-1 h-16">
          {stats.daily.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col justify-end h-full" title={`${format(new Date(d.date), "dd/MM")} : ${d.count}`}>
              <div className={`rounded-sm ${d.count ? "bg-primary" : "bg-muted"}`} style={{ height: `${d.count ? Math.max(8, (d.count / maxDay) * 100) : 6}%` }} />
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucune candidature{filter !== "all" ? " à cette étape" : " pour le moment"}.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {shown.map((r) => (
            <li key={r.id}>
              <Link to={`${base}/candidatures/${r.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
                  {r.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate capitalize">{r.full_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={11} /> {format(new Date(r.created_at), "dd/MM/yyyy")}</div>
                </div>
                {r.ai_match_percentage != null && (
                  <span className="text-xs font-semibold text-primary tabular-nums">{r.ai_match_percentage} %</span>
                )}
                <Badge variant="outline" className="hidden sm:inline-flex">{STATUS_LABEL[r.status]}</Badge>
                <ChevronRight size={16} className="text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">{icon}{label}</div>
      <div className="text-xl font-bold mt-1 tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function FilterChip({ active, onClick, dot, children }: { active: boolean; onClick: () => void; dot?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
      {dot && <span className={`h-2 w-2 rounded-full ${dot}`} />}{children}
    </button>
  );
}
