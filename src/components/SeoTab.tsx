import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Search,
  FileText,
  AlertCircle,
  CheckCircle2,
  Camera,
  ExternalLink,
  CircleCheck,
  CircleX,
  Globe,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { toast } from "@/hooks/use-toast";

type Totals = { clicks: number; impressions: number; ctr: number; position: number };
type SeriesPoint = { date: string; clicks: number; impressions: number; ctr: number; position: number };
type Row = { query?: string; page?: string; clicks: number; impressions: number; ctr: number; position: number };
type Sitemap = { path: string; lastSubmitted?: string; lastDownloaded?: string; isPending?: boolean; warnings: number; errors: number; indexed: number } | null;
type Live = { range: { start: string; end: string }; totals: Totals; series: SeriesPoint[]; topQueries: Row[]; topPages: Row[]; sitemap: Sitemap };
type Previous = { captured_at: string; clicks: number; impressions: number; ctr: number; position: number; indexed_count: number; errors_count: number } | null;

function fmt(n: number, d = 0) { return Number(n || 0).toLocaleString("fr-FR", { maximumFractionDigits: d }); }
function pct(n: number) { return `${(n * 100).toFixed(2)}%`; }

function DeltaPill({ current, previous, invert = false }: { current: number; previous?: number | null; invert?: boolean }) {
  if (previous === null || previous === undefined) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.0001) {
    return <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">=</span>;
  }
  const isPositive = invert ? diff < 0 : diff > 0;
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
        isPositive
          ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
          : "text-rose-600 bg-rose-500/10 dark:text-rose-400"
      }`}
    >
      <Icon size={10} />
      {diff > 0 ? "+" : ""}{fmt(diff, 2)}
    </span>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-2xl border border-border/60 bg-card/70 backdrop-blur-md shadow-sm hover:border-primary/30 transition-colors ${className}`}
    >
      {children}
    </div>
  );
}

export default function SeoTab() {
  const [loading, setLoading] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);
  const [live, setLive] = useState<Live | null>(null);
  const [previous, setPrevious] = useState<Previous>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (snapshot = false) => {
    snapshot ? setSnapshotting(true) : setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("gsc-dashboard", {
        body: { action: snapshot ? "snapshot" : "live" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLive(data.live);
      setPrevious(data.previous);
      if (snapshot) toast({ title: "Snapshot capturé", description: "L'état actuel a été enregistré." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      setError(msg);
      toast({ title: "Erreur GSC", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
      setSnapshotting(false);
    }
  };

  useEffect(() => { load(false); }, []);

  const kpis = [
    { label: "Clics", value: fmt(live?.totals.clicks ?? 0), prev: previous?.clicks, raw: live?.totals.clicks ?? 0 },
    { label: "Impressions", value: fmt(live?.totals.impressions ?? 0), prev: previous?.impressions, raw: live?.totals.impressions ?? 0 },
    { label: "CTR moyen", value: pct(live?.totals.ctr ?? 0), prev: previous?.ctr, raw: live?.totals.ctr ?? 0 },
    { label: "Position moyenne", value: fmt(live?.totals.position ?? 0, 1), prev: previous?.position, raw: live?.totals.position ?? 0, invert: true },
  ];

  return (
    <div className="space-y-6 relative">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-20 -left-10 w-96 h-96 rounded-full bg-primary/10 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute top-40 right-0 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />

      {/* Hero header */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-[#007aa3] items-center justify-center shadow-lg shadow-primary/30">
            <Search size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Tableau de bord SEO
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
              <Globe size={12} /> cloudmature.com
              {live && (
                <span className="text-muted-foreground/70">
                  · {live.range.start} → {live.range.end}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(false)}
            disabled={loading}
            className="rounded-lg backdrop-blur-sm bg-card/60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Actualiser
          </Button>
          <Button
            size="sm"
            onClick={() => load(true)}
            disabled={snapshotting}
            className="rounded-lg bg-primary hover:bg-[#007aa3] text-primary-foreground shadow-lg shadow-primary/30"
          >
            <Camera size={14} />
            Snapshot
          </Button>
        </div>
      </div>

      {error && (
        <div className="relative rounded-2xl border border-destructive/40 bg-destructive/5 backdrop-blur-sm p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-destructive mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-destructive">Impossible de charger les données GSC</p>
            <p className="text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      )}

      {previous && (
        <p className="relative text-xs text-muted-foreground -mt-2">
          Comparaison vs snapshot du {new Date(previous.captured_at).toLocaleString("fr-FR")}
        </p>
      )}

      {/* KPI cards */}
      <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <GlassCard key={k.label} className="p-5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {k.label}
            </p>
            <div className="flex items-end justify-between gap-2">
              <h3 className="text-2xl font-bold text-foreground tabular-nums">{k.value}</h3>
              <div className="pb-1">
                <DeltaPill current={k.raw} previous={k.prev} invert={k.invert} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Performance chart */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-base font-semibold text-foreground">Performance sur 28 jours</h3>
            <p className="text-xs text-muted-foreground">Évolution quotidienne des clics et impressions</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
              <span className="text-muted-foreground">Clics</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
              <span className="text-muted-foreground">Impressions</span>
            </div>
          </div>
        </div>
        {live && live.series.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={live.series} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="seoClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="seoImpr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "0 8px 24px -8px rgba(0,0,0,0.15)",
                  }}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="impressions"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  fill="url(#seoImpr)"
                  name="Impressions"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="clicks"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#seoClicks)"
                  name="Clics"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-12 text-center">
            {loading
              ? "Chargement…"
              : "Aucune donnée disponible (GSC met ~2 jours à collecter les premières données après vérification)."}
          </p>
        )}
      </GlassCard>

      {/* Sitemap & coverage */}
      <div className="grid md:grid-cols-2 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Sitemap</h3>
              <p className="text-xs text-muted-foreground">État du fichier soumis à Google</p>
            </div>
          </div>
          {live?.sitemap ? (
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">Fichier</span>
                <span className="font-mono text-xs truncate max-w-[60%] text-foreground">
                  {live.sitemap.path.split("/").pop()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">URLs soumises</span>
                <span className="font-semibold text-foreground tabular-nums">{fmt(live.sitemap.indexed)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">Dernière soumission</span>
                <span className="text-xs text-foreground">
                  {live.sitemap.lastSubmitted ? new Date(live.sitemap.lastSubmitted).toLocaleDateString("fr-FR") : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">Dernier crawl Google</span>
                <span className="text-xs text-foreground">
                  {live.sitemap.lastDownloaded ? new Date(live.sitemap.lastDownloaded).toLocaleDateString("fr-FR") : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <span className="text-muted-foreground text-xs">Statut</span>
                {live.sitemap.errors > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-destructive/15 text-destructive px-2 py-1 rounded-full">
                    <CircleX size={10} /> {live.sitemap.errors} erreurs
                  </span>
                ) : live.sitemap.warnings > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full">
                    {live.sitemap.warnings} avert.
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full">
                    <CircleCheck size={10} /> OK
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">Aucun sitemap enregistré dans GSC.</p>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Indexation</h3>
              <p className="text-xs text-muted-foreground">Couverture et erreurs de crawl</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{fmt(live?.sitemap?.indexed ?? 0)}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-0.5">
                Découvertes
              </p>
            </div>
            <div className="border-l border-border/50 pl-3">
              <p
                className={`text-2xl font-bold tabular-nums ${
                  (live?.sitemap?.errors ?? 0) > 0 ? "text-destructive" : "text-foreground"
                }`}
              >
                {fmt(live?.sitemap?.errors ?? 0)}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Erreurs</p>
            </div>
            <div className="border-l border-border/50 pl-3">
              <p
                className={`text-2xl font-bold tabular-nums ${
                  (live?.sitemap?.warnings ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                }`}
              >
                {fmt(live?.sitemap?.warnings ?? 0)}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Avert.</p>
            </div>
          </div>
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noreferrer"
            className="mt-4 text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            Ouvrir Search Console <ExternalLink size={11} />
          </a>
        </GlassCard>
      </div>

      {/* Top queries / pages */}
      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/30 flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">Top requêtes</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {live?.topQueries?.length ?? 0} résultats
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-5 py-2.5 font-semibold">Requête</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Clics</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Impr.</th>
                  <th className="text-right px-5 py-2.5 font-semibold">Pos.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {(live?.topQueries ?? []).map((r, i) => (
                  <tr key={i} className="hover:bg-primary/5 transition-colors">
                    <td className="px-5 py-3 truncate max-w-[200px] text-foreground">{r.query}</td>
                    <td className="text-right px-3 py-3 font-semibold text-foreground tabular-nums">{fmt(r.clicks)}</td>
                    <td className="text-right px-3 py-3 text-muted-foreground tabular-nums">{fmt(r.impressions)}</td>
                    <td className="text-right px-5 py-3 text-foreground tabular-nums">{fmt(r.position, 1)}</td>
                  </tr>
                ))}
                {(!live || live.topQueries.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-muted-foreground text-xs">
                      Aucune donnée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/30 flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">Top pages</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {live?.topPages?.length ?? 0} résultats
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-5 py-2.5 font-semibold">Page</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Clics</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Impr.</th>
                  <th className="text-right px-5 py-2.5 font-semibold">Pos.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {(live?.topPages ?? []).map((r, i) => (
                  <tr key={i} className="hover:bg-primary/5 transition-colors">
                    <td className="px-5 py-3 truncate max-w-[200px]">
                      <a
                        href={r.page}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-medium"
                      >
                        {r.page?.replace("https://cloudmature.com", "") || "/"}
                      </a>
                    </td>
                    <td className="text-right px-3 py-3 font-semibold text-foreground tabular-nums">{fmt(r.clicks)}</td>
                    <td className="text-right px-3 py-3 text-muted-foreground tabular-nums">{fmt(r.impressions)}</td>
                    <td className="text-right px-5 py-3 text-foreground tabular-nums">{fmt(r.position, 1)}</td>
                  </tr>
                ))}
                {(!live || live.topPages.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-muted-foreground text-xs">
                      Aucune donnée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
