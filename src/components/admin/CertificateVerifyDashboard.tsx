import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, RefreshCw, Activity, Ban, Search, AlertTriangle, Hash } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

type Row = { ip: string; code: string | null; ok: boolean; attempted_at: string };
type Window = "1h" | "24h" | "7d";

const WINDOW_LABEL: Record<Window, string> = { "1h": "1 heure", "24h": "24 heures", "7d": "7 jours" };
const WINDOW_MS: Record<Window, number> = { "1h": 60 * 60 * 1000, "24h": 24 * 3600 * 1000, "7d": 7 * 24 * 3600 * 1000 };

const SHORT_WIN_S = 60;
const SHORT_MAX = 10;
const LONG_WIN_S = 600;
const LONG_MAX = 60;
const CODE_RE = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

function fmtDate(d: Date) {
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

type Reason = "success" | "malformed" | "throttled" | "invalid";
const REASON_META: Record<Reason, { label: string; cls: string }> = {
  success:   { label: "Vérification réussie",       cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  malformed: { label: "Code mal formé",             cls: "bg-amber-100 text-amber-700 border-amber-300" },
  throttled: { label: "Bloqué (anti-bruteforce)",   cls: "bg-rose-100 text-rose-700 border-rose-300" },
  invalid:   { label: "Code inconnu / expiré",      cls: "bg-slate-100 text-slate-700 border-slate-300" },
};

function classifyAttempts(attempts: { ip: string; code: string | null; ok: boolean; attempted_at: string }[]) {
  // Group times per IP to detect throttling at moment of attempt
  const perIp = new Map<string, number[]>();
  for (const a of attempts) {
    const arr = perIp.get(a.ip) || [];
    arr.push(new Date(a.attempted_at).getTime());
    perIp.set(a.ip, arr);
  }
  perIp.forEach((arr) => arr.sort((a, b) => a - b));

  return attempts.map((a) => {
    let reason: Reason;
    if (a.ok) reason = "success";
    else if (!a.code) reason = "malformed";
    else {
      const t = new Date(a.attempted_at).getTime();
      const arr = perIp.get(a.ip) || [];
      let shortC = 0, longC = 0;
      for (const ts of arr) {
        if (ts >= t) break;
        const dt = t - ts;
        if (dt <= SHORT_WIN_S * 1000) shortC++;
        if (dt <= LONG_WIN_S * 1000) longC++;
      }
      reason = (shortC >= SHORT_MAX || longC >= LONG_MAX) ? "throttled" : "invalid";
    }
    return { ...a, reason };
  });
}


export function CertificateVerifyDashboard() {
  const [win, setWin] = useState<Window>("24h");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - WINDOW_MS[win]).toISOString();
    const { data, error } = await supabase
      .from("verify_attempts")
      .select("ip, code, ok, attempted_at")
      .gte("attempted_at", since)
      .order("attempted_at", { ascending: false })
      .limit(5000);
    if (!error && data) setRows(data as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [win]);

  const stats = useMemo(() => {
    const total = rows.length;
    const ok = rows.filter(r => r.ok).length;
    const fail = total - ok;
    const malformed = rows.filter(r => !r.code).length;
    const uniqueIps = new Set(rows.map(r => r.ip)).size;
    const rate = total ? Math.round((ok / total) * 1000) / 10 : 0;
    return { total, ok, fail, malformed, uniqueIps, rate };
  }, [rows]);

  // Time-series buckets
  const series = useMemo(() => {
    if (rows.length === 0) return [];
    const bucketMs = win === "1h" ? 60_000 : win === "24h" ? 3600_000 : 6 * 3600_000;
    const map = new Map<number, { ts: number; ok: number; fail: number }>();
    const start = Date.now() - WINDOW_MS[win];
    for (let t = Math.floor(start / bucketMs) * bucketMs; t <= Date.now(); t += bucketMs) {
      map.set(t, { ts: t, ok: 0, fail: 0 });
    }
    for (const r of rows) {
      const t = Math.floor(new Date(r.attempted_at).getTime() / bucketMs) * bucketMs;
      const b = map.get(t) || { ts: t, ok: 0, fail: 0 };
      if (r.ok) b.ok++; else b.fail++;
      map.set(t, b);
    }
    return [...map.values()].sort((a, b) => a.ts - b.ts).map(b => ({
      label: win === "1h"
        ? new Date(b.ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : win === "24h"
        ? new Date(b.ts).toLocaleTimeString("fr-FR", { hour: "2-digit" }) + "h"
        : new Date(b.ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      Succès: b.ok,
      Échecs: b.fail,
    }));
  }, [rows, win]);

  // Blocked IPs: count overlap with the throttling windows (10/60s or 60/10min)
  const blocks = useMemo(() => {
    const byIp = new Map<string, { ip: string; total: number; ok: number; fail: number; blocked: number; last: string }>();
    // Group by ip
    for (const r of rows) {
      const cur = byIp.get(r.ip) || { ip: r.ip, total: 0, ok: 0, fail: 0, blocked: 0, last: r.attempted_at };
      cur.total++;
      if (r.ok) cur.ok++; else cur.fail++;
      if (new Date(r.attempted_at) > new Date(cur.last)) cur.last = r.attempted_at;
      byIp.set(r.ip, cur);
    }
    // For each ip, count attempts that would have been blocked: any attempt with > SHORT_MAX in the prior SHORT_WIN_S or > LONG_MAX in prior LONG_WIN_S
    for (const [ip, agg] of byIp) {
      const times = rows.filter(r => r.ip === ip).map(r => new Date(r.attempted_at).getTime()).sort((a, b) => a - b);
      let blocked = 0;
      for (let i = 0; i < times.length; i++) {
        const t = times[i];
        let shortC = 0, longC = 0;
        for (let j = i - 1; j >= 0; j--) {
          const dt = t - times[j];
          if (dt <= SHORT_WIN_S * 1000) shortC++;
          if (dt <= LONG_WIN_S * 1000) longC++;
          if (dt > LONG_WIN_S * 1000) break;
        }
        if (shortC >= SHORT_MAX || longC >= LONG_MAX) blocked++;
      }
      agg.blocked = blocked;
    }
    return [...byIp.values()].sort((a, b) => b.total - a.total).slice(0, 25);
  }, [rows]);

  const totalBlocked = blocks.reduce((s, b) => s + b.blocked, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Vérifications de certificats
          </h2>
          <p className="text-xs text-muted-foreground">Tentatives, taux de succès et blocages par fenêtre — {WINDOW_LABEL[win]}.</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={win} onValueChange={(v) => setWin(v as Window)}>
            <TabsList>
              <TabsTrigger value="1h">1 h</TabsTrigger>
              <TabsTrigger value="24h">24 h</TabsTrigger>
              <TabsTrigger value="7d">7 j</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi icon={<Activity className="h-4 w-4" />} label="Tentatives" value={stats.total} color="text-primary" />
        <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Succès" value={stats.ok} sub={`${stats.rate}%`} color="text-emerald-600" />
        <Kpi icon={<XCircle className="h-4 w-4" />} label="Échecs" value={stats.fail} sub={`${stats.malformed} mal formés`} color="text-red-500" />
        <Kpi icon={<ShieldAlert className="h-4 w-4" />} label="IP uniques" value={stats.uniqueIps} color="text-amber-600" />
        <Kpi icon={<Ban className="h-4 w-4" />} label="Blocages" value={totalBlocked} sub="par fenêtres" color="text-rose-600" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tentatives dans le temps</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {loading ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Chargement…</div>
          ) : series.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Aucune tentative sur cette fenêtre.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Succès" stackId="a" fill="#10b981" />
                <Bar dataKey="Échecs" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top IP — activité & blocages</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">IP</th>
                  <th className="text-right px-3 py-2">Total</th>
                  <th className="text-right px-3 py-2">Succès</th>
                  <th className="text-right px-3 py-2">Échecs</th>
                  <th className="text-right px-3 py-2">Bloquées</th>
                  <th className="text-left px-3 py-2">Dernière</th>
                </tr>
              </thead>
              <tbody>
                {blocks.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Aucune donnée</td></tr>
                ) : blocks.map(b => (
                  <tr key={b.ip} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{b.ip}</td>
                    <td className="px-3 py-2 text-right">{b.total}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{b.ok}</td>
                    <td className="px-3 py-2 text-right text-red-500">{b.fail}</td>
                    <td className="px-3 py-2 text-right">
                      {b.blocked > 0
                        ? <Badge className="bg-rose-100 text-rose-700 border-rose-300">{b.blocked}</Badge>
                        : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(new Date(b.last))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Seuils anti-bruteforce : {SHORT_MAX} tentatives / {SHORT_WIN_S}s et {LONG_MAX} / {LONG_WIN_S / 60} min par IP.
      </p>
    </div>
  );
}

function Kpi({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: number; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${color ?? "text-primary"}`}>{icon} {label}</div>
        <div className="mt-1 text-2xl font-bold">{value.toLocaleString("fr-FR")}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
