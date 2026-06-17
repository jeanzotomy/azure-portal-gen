import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HrSectionHeader from "@/components/hr/HrSectionHeader";
import { exportCsv } from "@/lib/csv-export";
import { format, subDays } from "date-fns";
import {
  LayoutDashboard, Briefcase, CheckCircle2, Users, GraduationCap,
  AlertTriangle, Clock, FileSignature, Loader2, TrendingUp, Timer, Trophy, FileDown,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  LineChart, Line,
} from "recharts";

interface Kpis {
  appsMonth: number;
  acceptanceRate: number;
  interviewRate: number;
  avgProcessingDays: number;
  onboardingsActive: number;
  trainingsDueSoon: number;
}
interface FunnelPoint { name: string; value: number; }
interface DailyPoint { date: string; count: number; }
interface TopJob { id: string; title: string; count: number; }
interface Alerts {
  unsignedContractsOver7d: number;
  onboardingStuckOver14d: number;
  trainingsOverdue: number;
}

const FUNNEL_COLORS = ["#3b82f6", "#f59e0b", "#a855f7", "#10b981"];

export default function HrDashboardTab() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Kpis>({ appsMonth: 0, acceptanceRate: 0, interviewRate: 0, avgProcessingDays: 0, onboardingsActive: 0, trainingsDueSoon: 0 });
  const [funnel, setFunnel] = useState<FunnelPoint[]>([]);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [topJobs, setTopJobs] = useState<TopJob[]>([]);
  const [alerts, setAlerts] = useState<Alerts>({ unsignedContractsOver7d: 0, onboardingStuckOver14d: 0, trainingsOverdue: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thirtyDaysAgoDate = subDays(now, 30);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400_000).toISOString();

    const [appsMonthRes, appsAllRes, processesRes, contractsRes, assignedRes, jobsRes] = await Promise.all([
      supabase.from("job_applications").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth),
      supabase.from("job_applications").select("status, created_at, updated_at, job_id"),
      supabase.from("onboarding_processes").select("id, status, created_at, kind").eq("kind", "onboarding"),
      supabase.from("onboarding_contracts").select("uploaded_at, signed_at"),
      supabase.from("onboarding_assigned_trainings").select("assigned_at, completed_at"),
      supabase.from("job_postings").select("id, title"),
    ]);

    const apps = (appsAllRes.data || []) as { status: string; created_at: string; updated_at: string; job_id: string }[];
    const total = apps.length;
    const accepted = apps.filter(a => a.status === "acceptee").length;
    const interviewed = apps.filter(a => ["entretien", "acceptee"].includes(a.status)).length;
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    const interviewRate = total > 0 ? Math.round((interviewed / total) * 100) : 0;

    // Délai moyen de traitement (jours) pour les candidatures finalisées
    const finalized = apps.filter(a => ["acceptee", "refusee"].includes(a.status));
    const avgProcessingDays = finalized.length > 0
      ? Math.round(finalized.reduce((sum, a) => {
          const diff = (new Date(a.updated_at).getTime() - new Date(a.created_at).getTime()) / 86400_000;
          return sum + diff;
        }, 0) / finalized.length)
      : 0;

    // Candidatures par jour sur 30 jours
    const dailyMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(now, i), "dd/MM");
      dailyMap.set(d, 0);
    }
    apps.forEach(a => {
      const d = new Date(a.created_at);
      if (d >= thirtyDaysAgoDate) {
        const k = format(d, "dd/MM");
        dailyMap.set(k, (dailyMap.get(k) || 0) + 1);
      }
    });
    setDaily(Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })));

    // Top 3 offres
    const jobs = (jobsRes.data || []) as { id: string; title: string }[];
    const countByJob = new Map<string, number>();
    apps.forEach(a => countByJob.set(a.job_id, (countByJob.get(a.job_id) || 0) + 1));
    const top = Array.from(countByJob.entries())
      .map(([id, count]) => ({ id, title: jobs.find(j => j.id === id)?.title || "Offre inconnue", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    setTopJobs(top);

    const processes = (processesRes.data || []) as { status: string; created_at: string }[];
    const onboardingsActive = processes.filter(p => p.status !== "complete").length;
    const onboardingStuckOver14d = processes.filter(p => p.status !== "complete" && p.created_at < fourteenDaysAgo).length;

    const contracts = (contractsRes.data || []) as { uploaded_at: string; signed_at: string | null }[];
    const unsignedContractsOver7d = contracts.filter(c => !c.signed_at && c.uploaded_at < sevenDaysAgo).length;

    const assigned = (assignedRes.data || []) as { assigned_at: string; completed_at: string | null }[];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
    const twentyThreeDaysAgo = new Date(Date.now() - 23 * 86400_000).toISOString();
    const trainingsOverdue = assigned.filter(a => !a.completed_at && a.assigned_at < thirtyDaysAgo).length;
    const trainingsDueSoon = assigned.filter(a => !a.completed_at && a.assigned_at < twentyThreeDaysAgo && a.assigned_at >= thirtyDaysAgo).length;

    setKpis({
      appsMonth: appsMonthRes.count || 0,
      acceptanceRate,
      interviewRate,
      avgProcessingDays,
      onboardingsActive,
      trainingsDueSoon,
    });

    setFunnel([
      { name: "Reçues", value: apps.length },
      { name: "En revue", value: apps.filter(a => ["en_revue", "entretien", "acceptee"].includes(a.status)).length },
      { name: "Entretien", value: apps.filter(a => ["entretien", "acceptee"].includes(a.status)).length },
      { name: "Acceptées", value: accepted },
    ]);

    setAlerts({ unsignedContractsOver7d, onboardingStuckOver14d, trainingsOverdue });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const exportSnapshot = () => {
    const rows = [
      { metrique: "Candidatures ce mois", valeur: kpis.appsMonth },
      { metrique: "Taux d'acceptation (%)", valeur: kpis.acceptanceRate },
      { metrique: "Taux d'entretien (%)", valeur: kpis.interviewRate },
      { metrique: "Délai moyen traitement (jours)", valeur: kpis.avgProcessingDays },
      { metrique: "Onboardings en cours", valeur: kpis.onboardingsActive },
      { metrique: "Formations à finir < 7j", valeur: kpis.trainingsDueSoon },
      { metrique: "Contrats non signés > 7j", valeur: alerts.unsignedContractsOver7d },
      { metrique: "Onboardings bloqués > 14j", valeur: alerts.onboardingStuckOver14d },
      { metrique: "Formations en retard", valeur: alerts.trainingsOverdue },
    ];
    exportCsv(`snapshot-rh-${format(new Date(), "yyyy-MM-dd")}.csv`, rows);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const kpiCards = [
    { icon: Briefcase, label: "Candidatures ce mois", value: kpis.appsMonth, tint: "text-blue-600 bg-blue-500/10" },
    { icon: CheckCircle2, label: "Taux d'acceptation", value: `${kpis.acceptanceRate}%`, tint: "text-emerald-600 bg-emerald-500/10" },
    { icon: TrendingUp, label: "Taux d'entretien", value: `${kpis.interviewRate}%`, tint: "text-purple-600 bg-purple-500/10" },
    { icon: Timer, label: "Délai moyen (j)", value: kpis.avgProcessingDays, tint: "text-orange-600 bg-orange-500/10" },
    { icon: Users, label: "Onboardings en cours", value: kpis.onboardingsActive, tint: "text-indigo-600 bg-indigo-500/10" },
    { icon: GraduationCap, label: "Formations à finir < 7j", value: kpis.trainingsDueSoon, tint: "text-amber-600 bg-amber-500/10" },
  ];

  const alertItems = [
    { icon: FileSignature, label: "Contrats non signés depuis > 7 jours", value: alerts.unsignedContractsOver7d },
    { icon: Clock, label: "Onboardings bloqués depuis > 14 jours", value: alerts.onboardingStuckOver14d },
    { icon: AlertTriangle, label: "Formations en retard", value: alerts.trainingsOverdue },
  ];

  return (
    <div className="space-y-5">
      <HrSectionHeader
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Vue d'ensemble RH"
        description="Indicateurs de recrutement, onboarding et formations en temps réel."
        onRefresh={load}
        right={
          <Button size="sm" variant="outline" onClick={exportSnapshot}>
            <FileDown size={14} className="mr-1.5" /> Exporter snapshot
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiCards.map(k => (
          <Card key={k.label} className="p-4">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg mb-2 ${k.tint}`}>
              <k.icon className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold">{k.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="font-semibold mb-3 text-sm">Candidatures sur 30 jours</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={3} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="font-semibold mb-3 text-sm">Funnel de recrutement</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ left: 10, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {funnel.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <div className="font-semibold mb-3 text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" /> Top 3 offres par candidatures
          </div>
          <div className="space-y-2">
            {topJobs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune candidature.</p>
            )}
            {topJobs.map((j, i) => (
              <div key={j.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/40 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs ${i === 0 ? "bg-amber-500/15 text-amber-700" : i === 1 ? "bg-zinc-400/20 text-zinc-700" : "bg-orange-500/15 text-orange-700"}`}>#{i + 1}</span>
                  <span className="text-sm font-medium truncate">{j.title}</span>
                </div>
                <Badge variant="secondary">{j.count}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="font-semibold mb-3 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertes du jour
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          {alertItems.map(a => (
            <div key={a.label} className="flex items-center justify-between p-3 rounded-lg border bg-card/40">
              <div className="flex items-center gap-2 text-sm">
                <a.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs sm:text-sm">{a.label}</span>
              </div>
              <Badge variant={a.value > 0 ? "destructive" : "secondary"}>{a.value}</Badge>
            </div>
          ))}
        </div>
        {alertItems.every(a => a.value === 0) && (
          <p className="text-sm text-muted-foreground text-center py-3 mt-2">Aucune alerte - tout est à jour 🎉</p>
        )}
      </Card>
    </div>
  );
}
