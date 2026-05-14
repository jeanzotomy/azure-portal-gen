import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, Search, FileText, AlertCircle, CheckCircle2, Camera, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "@/hooks/use-toast";

type Totals = { clicks: number; impressions: number; ctr: number; position: number };
type SeriesPoint = { date: string; clicks: number; impressions: number; ctr: number; position: number };
type Row = { query?: string; page?: string; clicks: number; impressions: number; ctr: number; position: number };
type Sitemap = { path: string; lastSubmitted?: string; lastDownloaded?: string; isPending?: boolean; warnings: number; errors: number; indexed: number } | null;
type Live = { range: { start: string; end: string }; totals: Totals; series: SeriesPoint[]; topQueries: Row[]; topPages: Row[]; sitemap: Sitemap };
type Previous = { captured_at: string; clicks: number; impressions: number; ctr: number; position: number; indexed_count: number; errors_count: number } | null;

function fmt(n: number, d = 0) { return Number(n || 0).toLocaleString("fr-FR", { maximumFractionDigits: d }); }
function pct(n: number) { return `${(n * 100).toFixed(2)}%`; }

function Delta({ current, previous, invert = false }: { current: number; previous?: number | null; invert?: boolean }) {
  if (previous === null || previous === undefined) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.0001) return <span className="text-xs text-muted-foreground">=</span>;
  const isPositive = invert ? diff < 0 : diff > 0;
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isPositive ? "text-emerald-600" : "text-destructive"}`}>
      <Icon size={12} />
      {diff > 0 ? "+" : ""}{fmt(diff, 2)}
    </span>
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Search size={20} className="text-primary" /> Tableau de bord SEO
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Données Google Search Console pour <span className="font-medium">cloudmature.com</span>
            {live && <> · {live.range.start} → {live.range.end}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(false)} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser
          </Button>
          <Button size="sm" onClick={() => load(true)} disabled={snapshotting}>
            <Camera size={14} /> Capturer un snapshot
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-destructive mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Impossible de charger les données GSC</p>
              <p className="text-muted-foreground mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {previous && (
        <p className="text-xs text-muted-foreground">
          Comparaison vs snapshot du {new Date(previous.captured_at).toLocaleString("fr-FR")}
        </p>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Clics", value: fmt(live?.totals.clicks ?? 0), prev: previous?.clicks, raw: live?.totals.clicks ?? 0 },
          { label: "Impressions", value: fmt(live?.totals.impressions ?? 0), prev: previous?.impressions, raw: live?.totals.impressions ?? 0 },
          { label: "CTR", value: pct(live?.totals.ctr ?? 0), prev: previous?.ctr, raw: live?.totals.ctr ?? 0 },
          { label: "Position moyenne", value: fmt(live?.totals.position ?? 0, 1), prev: previous?.position, raw: live?.totals.position ?? 0, invert: true },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{k.value}</p>
              <div className="mt-1"><Delta current={k.raw} previous={k.prev} invert={k.invert} /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Performance sur 28 jours</CardTitle></CardHeader>
        <CardContent>
          {live && live.series.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={live.series}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Clics" />
                  <Line yAxisId="right" type="monotone" dataKey="impressions" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="Impressions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">{loading ? "Chargement…" : "Aucune donnée disponible (GSC met ~2 jours à collecter les premières données après vérification)."}</p>
          )}
        </CardContent>
      </Card>

      {/* Sitemap & coverage */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText size={16} /> Sitemap</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {live?.sitemap ? (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Fichier</span><span className="font-mono text-xs truncate max-w-[60%]">{live.sitemap.path.split("/").pop()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">URLs soumises</span><span className="font-medium">{fmt(live.sitemap.indexed)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dernière soumission</span><span>{live.sitemap.lastSubmitted ? new Date(live.sitemap.lastSubmitted).toLocaleDateString("fr-FR") : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dernier crawl Google</span><span>{live.sitemap.lastDownloaded ? new Date(live.sitemap.lastDownloaded).toLocaleDateString("fr-FR") : "—"}</span></div>
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Statut</span>
                  {live.sitemap.errors > 0 ? <Badge variant="destructive">{live.sitemap.errors} erreurs</Badge>
                   : live.sitemap.warnings > 0 ? <Badge className="bg-amber-500">{live.sitemap.warnings} avertissements</Badge>
                   : <Badge className="bg-emerald-500"><CheckCircle2 size={12} className="mr-1" />OK</Badge>}
                </div>
              </>
            ) : <p className="text-muted-foreground">Aucun sitemap enregistré dans GSC.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Indexation</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">URLs découvertes</span><span className="font-medium">{fmt(live?.sitemap?.indexed ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Erreurs de crawl</span>
              <span className={`font-medium ${(live?.sitemap?.errors ?? 0) > 0 ? "text-destructive" : "text-emerald-600"}`}>{fmt(live?.sitemap?.errors ?? 0)}</span>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Avertissements</span>
              <span className={`font-medium ${(live?.sitemap?.warnings ?? 0) > 0 ? "text-amber-600" : "text-muted-foreground"}`}>{fmt(live?.sitemap?.warnings ?? 0)}</span>
            </div>
            <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2">
              Ouvrir Search Console <ExternalLink size={11} />
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Top queries / pages */}
      <div className="grid lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top requêtes</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr><th className="text-left py-2 font-medium">Requête</th><th className="text-right py-2 font-medium">Clics</th><th className="text-right py-2 font-medium">Impr.</th><th className="text-right py-2 font-medium">Pos.</th></tr>
                </thead>
                <tbody>
                  {(live?.topQueries ?? []).map((r, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="py-2 truncate max-w-[200px]">{r.query}</td>
                      <td className="text-right py-2">{fmt(r.clicks)}</td>
                      <td className="text-right py-2 text-muted-foreground">{fmt(r.impressions)}</td>
                      <td className="text-right py-2">{fmt(r.position, 1)}</td>
                    </tr>
                  ))}
                  {(!live || live.topQueries.length === 0) && (
                    <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-xs">Aucune donnée</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top pages</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr><th className="text-left py-2 font-medium">Page</th><th className="text-right py-2 font-medium">Clics</th><th className="text-right py-2 font-medium">Impr.</th><th className="text-right py-2 font-medium">Pos.</th></tr>
                </thead>
                <tbody>
                  {(live?.topPages ?? []).map((r, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="py-2 truncate max-w-[200px]"><a href={r.page} target="_blank" rel="noreferrer" className="text-primary hover:underline">{r.page?.replace("https://cloudmature.com", "") || "/"}</a></td>
                      <td className="text-right py-2">{fmt(r.clicks)}</td>
                      <td className="text-right py-2 text-muted-foreground">{fmt(r.impressions)}</td>
                      <td className="text-right py-2">{fmt(r.position, 1)}</td>
                    </tr>
                  ))}
                  {(!live || live.topPages.length === 0) && (
                    <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-xs">Aucune donnée</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
