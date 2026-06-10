import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import HrSectionHeader from "@/components/hr/HrSectionHeader";
import {
  LayoutDashboard, Briefcase, CheckCircle2, Users, GraduationCap,
  AlertTriangle, Clock, FileSignature, Loader2,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";

interface Kpis {
  appsMonth: number;
  acceptanceRate: number;
  onboardingsActive: number;
  trainingsDueSoon: number;
}
interface FunnelPoint { name: string; value: number; }
interface Alerts {
  unsignedContractsOver7d: number;
  onboardingStuckOver14d: number;
  trainingsOverdue: number;
}

const FUNNEL_COLORS = ["#3b82f6", "#f59e0b", "#a855f7", "#10b981"];

export default function HrDashboardTab() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Kpis>({ appsMonth: 0, acceptanceRate: 0, onboardingsActive: 0, trainingsDueSoon: 0 });
  const [funnel, setFunnel] = useState<FunnelPoint[]>([]);
  const [alerts, setAlerts] = useState<Alerts>({ unsignedContractsOver7d: 0, onboardingStuckOver14d: 0, trainingsOverdue: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400_000).toISOString();
    const sevenDaysAhead = new Date(Date.now() + 7 * 86400_000).toISOString();

    const [appsMonthRes, appsAllStatusRes, processesRes, contractsRes, assignedRes] = await Promise.all([
      supabase.from("job_applications").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth),
      supabase.from("job_applications").select("status, created_at"),
      supabase.from("onboarding_processes").select("id, status, created_at, kind").eq("kind", "onboarding"),
      supabase.from("onboarding_contracts").select("created_at, signed_at"),
      supabase.from("onboarding_assigned_trainings").select("assigned_at, completed_at, due_at"),
    ]);

    const apps = (appsAllStatusRes.data || []) as { status: string; created_at: string }[];
    const total = apps.length;
    const accepted = apps.filter(a => a.status === "acceptee").length;
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    const processes = (processesRes.data || []) as { status: string; created_at: string }[];
    const onboardingsActive = processes.filter(p => p.status !== "complete").length;
    const onboardingStuckOver14d = processes.filter(p => p.status !== "complete" && p.created_at < fourteenDaysAgo).length;

    const contracts = (contractsRes.data || []) as { created_at: string; signed_at: string | null }[];
    const unsignedContractsOver7d = contracts.filter(c => !c.signed_at && c.created_at < sevenDaysAgo).length;

    const assigned = (assignedRes.data || []) as { completed_at: string | null; due_at?: string | null }[];
    const todayIso = new Date().toISOString();
    const trainingsDueSoon = assigned.filter(a => !a.completed_at && a.due_at && a.due_at <= sevenDaysAhead && a.due_at >= todayIso).length;
    const trainingsOverdue = assigned.filter(a => !a.completed_at && a.due_at && a.due_at < todayIso).length;

    setKpis({
      appsMonth: appsMonthRes.count || 0,
      acceptanceRate,
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

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const kpiCards = [
    { icon: Briefcase, label: "Candidatures ce mois", value: kpis.appsMonth, tint: "text-blue-600 bg-blue-500/10" },
    { icon: CheckCircle2, label: "Taux d'acceptation", value: `${kpis.acceptanceRate}%`, tint: "text-emerald-600 bg-emerald-500/10" },
    { icon: Users, label: "Onboardings en cours", value: kpis.onboardingsActive, tint: "text-purple-600 bg-purple-500/10" },
    { icon: GraduationCap, label: "Formations à finir < 7j", value: kpis.trainingsDueSoon, tint: "text-amber-600 bg-amber-500/10" },
  ];

  const alertItems = [
    { icon: FileSignature, label: "Contrats non signés depuis > 7 jours", value: alerts.unsignedContractsOver7d },
    { icon: Clock, label: "Onboardings bloqués depuis > 14 jours", value: alerts.onboardingStuckOver14d },
    { icon: AlertTriangle, label: "Formations en retard", value: alerts.trainingsOverdue },
  ];

  return (
    <div className="space-y-5">
      <HrSectionHeader icon={<LayoutDashboard className="h-5 w-5" />} title="Vue d'ensemble RH" onRefresh={load} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertes du jour
          </div>
          <div className="space-y-2">
            {alertItems.map(a => (
              <div key={a.label} className="flex items-center justify-between p-3 rounded-lg border bg-card/40">
                <div className="flex items-center gap-2 text-sm">
                  <a.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{a.label}</span>
                </div>
                <Badge variant={a.value > 0 ? "destructive" : "secondary"}>{a.value}</Badge>
              </div>
            ))}
            {alertItems.every(a => a.value === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune alerte — tout est à jour 🎉</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
