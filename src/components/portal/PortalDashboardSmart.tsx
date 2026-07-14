import { useEffect, useState, useCallback } from"react";
import { Link } from"react-router-dom";
import { supabase } from"@/integrations/supabase/client";
import { useAuthSession } from"@/hooks/use-auth-session";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import { Button } from"@/components/ui/button";
import {
 Bell, Receipt, TicketCheck, GraduationCap, AlertTriangle, TrendingUp, Loader2, ArrowRight, Sparkles,
} from"lucide-react";

interface PortalContext {
 open_tickets: number;
 unpaid_invoices: number;
 unpaid_amount: number;
 invoices_due_soon: number;
 active_trainings: number;
 completed_trainings: number;
 unread_notifications: number;
}

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

export function PortalDashboardSmart({ onOpenAssistant }: { onOpenAssistant?: () => void }) {
 const { user } = useAuthSession();
 const [ctx, setCtx] = useState<PortalContext | null>(null);
 const [loading, setLoading] = useState(true);

 const load = useCallback(async () => {
 if (!user) return;
 setLoading(true);
 const { data, error } = await (supabase.rpc as any)("get_portal_context");
 if (!error && data) setCtx(data as PortalContext);
 setLoading(false);
 }, [user]);

 useEffect(() => {
 void load();
 }, [load]);

 if (!user) return null;

 if (loading || !ctx) {
 return (
 <Card>
 <CardContent className="p-6 flex items-center justify-center text-sm text-muted-foreground gap-2">
 <Loader2 className="h-4 w-4 animate-spin"/> Chargement de votre tableau de bord…
 </CardContent>
 </Card>
 );
 }

 const alerts: { tone:"warning"|"danger"|"info"; text: string; link?: string }[] = [];
 if (ctx.invoices_due_soon > 0) {
 alerts.push({
 tone:"warning",
 text: `${ctx.invoices_due_soon} facture${ctx.invoices_due_soon > 1 ?"s arrivent":"arrive"} à échéance sous 7 jours`,
 link:"/portal?tab=invoices",
 });
 }
 if (ctx.open_tickets > 0) {
 alerts.push({
 tone:"info",
 text: `${ctx.open_tickets} ticket${ctx.open_tickets > 1 ?"s":""} en cours de traitement`,
 link:"/portal?tab=support",
 });
 }
 if (ctx.active_trainings > 0) {
 alerts.push({
 tone:"info",
 text: `${ctx.active_trainings} formation${ctx.active_trainings > 1 ?"s à compléter":"à compléter"}`,
 link:"/portal/formations",
 });
 }

 return (
 <Card className="border-border bg-card shadow-sm">
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between gap-2 flex-wrap">
 <CardTitle className="text-base flex items-center gap-2">
 <Sparkles className="h-4 w-4 text-primary"/>
 Votre tableau de bord intelligent
 </CardTitle>
 {onOpenAssistant && (
 <Button size="sm"variant="outline"onClick={onOpenAssistant}>
 <Sparkles className="h-3.5 w-3.5 mr-1 text-primary"/> Assistant IA
 </Button>
 )}
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
 <Kpi icon={<Bell className="h-3.5 w-3.5"/>} label="Notifications"value={ctx.unread_notifications} link="/portal/notifications"/>
 <Kpi icon={<TicketCheck className="h-3.5 w-3.5"/>} label="Tickets ouverts"value={ctx.open_tickets} tone={ctx.open_tickets > 0 ?"warning":"default"} />
 <Kpi icon={<Receipt className="h-3.5 w-3.5"/>} label="Factures impayées"value={`${ctx.unpaid_invoices}`} sub={ctx.unpaid_amount > 0 ? `${fmt(ctx.unpaid_amount)} GNF` : undefined} tone={ctx.unpaid_invoices > 0 ?"danger":"default"} />
 <Kpi icon={<GraduationCap className="h-3.5 w-3.5"/>} label="Formations actives"value={ctx.active_trainings} sub={`${ctx.completed_trainings} terminées`} tone="info"/>
 </div>

 {alerts.length > 0 && (
 <div className="space-y-1.5">
 {alerts.map((a, i) => {
 const cls = a.tone ==="danger" ?"bg-rose-50 border-rose-200 text-rose-800" : a.tone ==="warning" ?"bg-amber-50 border-amber-200 text-amber-800" :"bg-blue-50 border-blue-200 text-blue-800";
 const Icon = a.tone ==="danger"? AlertTriangle : a.tone ==="warning"? AlertTriangle : TrendingUp;
 return (
 <div key={i} className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs ${cls}`}>
 <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5"/> {a.text}</span>
 {a.link && (
 <Link to={a.link} className="inline-flex items-center gap-1 font-medium hover:underline">
 Voir <ArrowRight className="h-3 w-3"/>
 </Link>
 )}
 </div>
 );
 })}
 </div>
 )}
 </CardContent>
 </Card>
 );
}

function Kpi({ icon, label, value, sub, link, tone ="default"}: {
 icon: React.ReactNode;
 label: string;
 value: number | string;
 sub?: string;
 link?: string;
 tone?:"default"|"warning"|"danger"|"info";
}) {
 const toneCls = tone ==="danger"?"text-rose-700": tone ==="warning"?"text-amber-700": tone ==="info"?"text-blue-700":"text-foreground";
 const card = (
 <div className="rounded-lg border bg-card p-2.5 hover:bg-muted/40 transition">
 <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
 <span className="flex items-center gap-1">{icon} {label}</span>
 </div>
 <div className={`text-lg font-bold ${toneCls}`}>{value}</div>
 {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
 </div>
 );
 return link ? <Link to={link}>{card}</Link> : card;
}

export default PortalDashboardSmart;
