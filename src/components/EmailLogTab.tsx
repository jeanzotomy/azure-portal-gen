import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { RefreshCw, Search, Download, CheckCircle2, XCircle, Mail, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EmailLogRow {
  id: string;
  recipient_email: string;
  template_name: string;
  status: string;
  error_message: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
}

interface ApplicationOption {
  id: string;
  full_name: string;
  email: string;
}

const STATUS_FILTERS = [
  { value: "all", label: "Tous statuts" },
  { value: "sent", label: "Envoyé" },
  { value: "failed", label: "Échec" },
  { value: "pending", label: "En attente" },
] as const;

function statusBadge(status: string) {
  switch (status) {
    case "sent":
      return <Badge className="bg-green-500/10 text-green-700 border-green-500/30 hover:bg-green-500/10"><CheckCircle2 size={12} className="mr-1" />Envoyé</Badge>;
    case "failed":
    case "dlq":
      return <Badge className="bg-red-500/10 text-red-700 border-red-500/30 hover:bg-red-500/10"><XCircle size={12} className="mr-1" />Échec</Badge>;
    case "pending":
      return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 hover:bg-amber-500/10"><Clock size={12} className="mr-1" />En attente</Badge>;
    case "suppressed":
      return <Badge variant="outline" className="text-muted-foreground">Supprimé</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function EmailLogTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [applications, setApplications] = useState<ApplicationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [applicationFilter, setApplicationFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<EmailLogRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_send_log")
      .select("id, recipient_email, template_name, status, error_message, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data as any) || []);
    }
    setLoading(false);
  };

  const loadApplications = async () => {
    const { data } = await supabase
      .from("job_applications")
      .select("id, full_name, email")
      .order("created_at", { ascending: false })
      .limit(500);
    setApplications((data as any) || []);
  };

  const performDelete = async (target: EmailLogRow) => {
    setDeleting(true);
    const { error, count } = await supabase
      .from("email_send_log")
      .delete({ count: "exact" })
      .eq("id", target.id);
    setDeleting(false);

    const retryAction = (
      <ToastAction altText="Réessayer la suppression" onClick={() => { void performDelete(target); }}>
        Réessayer
      </ToastAction>
    );

    if (error) {
      const msg = error.message || "Erreur inconnue";
      const hint = /row-level security|permission|policy/i.test(msg)
        ? " (permissions insuffisantes — rôle admin ou gestionnaire requis)"
        : "";
      toast({
        title: "Échec de la suppression",
        description: `${msg}${hint}`,
        variant: "destructive",
        action: retryAction,
      });
      return;
    }

    if (!count || count === 0) {
      toast({
        title: "Aucune ligne supprimée",
        description: "L'entrée n'existe plus ou vous n'avez pas la permission de la supprimer.",
        variant: "destructive",
        action: retryAction,
      });
      setToDelete((cur) => (cur?.id === target.id ? null : cur));
      setRows((prev) => prev.filter((r) => r.id !== target.id));
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== target.id));
    toast({
      title: "Entrée supprimée",
      description: `Envoi à ${target.recipient_email} retiré de l'historique.`,
    });
    setToDelete((cur) => (cur?.id === target.id ? null : cur));
  };

  const handleDelete = () => {
    if (toDelete) void performDelete(toDelete);
  };

  useEffect(() => {
    load();
    loadApplications();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (applicationFilter !== "all") {
        const appId = r.metadata?.application_id;
        if (appId !== applicationFilter) return false;
      }
      if (q) {
        const hay = [
          r.recipient_email,
          r.template_name,
          r.error_message || "",
          r.metadata?.application_id || "",
          r.metadata?.job_title || "",
          r.metadata?.application_status || "",
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, applicationFilter, search]);

  const counts = useMemo(() => {
    let sent = 0, failed = 0, other = 0;
    for (const r of rows) {
      if (r.status === "sent") sent++;
      else if (r.status === "failed" || r.status === "dlq") failed++;
      else other++;
    }
    return { sent, failed, other, total: rows.length };
  }, [rows]);

  const exportCsv = () => {
    if (!filtered.length) {
      toast({ title: "Rien à exporter", description: "Aucun résultat dans les filtres actuels." });
      return;
    }
    const headers = [
      "Date",
      "Destinataire",
      "Template",
      "Statut",
      "Candidature ID",
      "Statut candidature",
      "Poste",
      "Fournisseur",
      "Message d'erreur",
    ];
    const lines = [headers.map(csvEscape).join(",")];
    for (const r of filtered) {
      lines.push([
        format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss"),
        r.recipient_email,
        r.template_name,
        r.status,
        r.metadata?.application_id || "",
        r.metadata?.application_status || "",
        r.metadata?.job_title || "",
        r.metadata?.provider || "",
        r.error_message || "",
      ].map(csvEscape).join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historique-envois-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Export CSV", description: `${filtered.length} ligne(s) exportée(s).` });
  };

  return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">Historique des envois</h3>
          <span className="text-xs text-muted-foreground">
            {counts.total} total · <span className="text-green-700">{counts.sent} envoyés</span> · <span className="text-red-700">{counts.failed} échecs</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={`mr-1 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </Button>
          <Button size="sm" onClick={exportCsv}>
            <Download size={14} className="mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher (email, template, poste, erreur...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={applicationFilter} onValueChange={setApplicationFilter}>
          <SelectTrigger><SelectValue placeholder="Filtrer par candidature" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes candidatures</SelectItem>
            {applications.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.full_name} — {a.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table (desktop) */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Destinataire</th>
                  <th className="text-left px-4 py-2 font-medium">Template</th>
                  <th className="text-left px-4 py-2 font-medium">Statut</th>
                  <th className="text-left px-4 py-2 font-medium">Poste</th>
                  <th className="text-left px-4 py-2 font-medium">Détails</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Chargement...</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Aucun envoi trouvé.</td></tr>
                )}
                {!loading && filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap font-medium">{r.recipient_email}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs">{r.template_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{statusBadge(r.status)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {r.metadata?.job_title || "—"}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {r.error_message ? (
                        <span className="text-red-600" title={r.error_message}>
                          {r.error_message.length > 80 ? r.error_message.slice(0, 80) + "…" : r.error_message}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {r.metadata?.provider ? `via ${r.metadata.provider}` : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setToDelete(r)}
                        aria-label="Supprimer"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-2">
        {loading && (
          <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">Chargement...</CardContent></Card>
        )}
        {!loading && filtered.length === 0 && (
          <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">Aucun envoi trouvé.</CardContent></Card>
        )}
        {!loading && filtered.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.recipient_email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                  </p>
                </div>
                {statusBadge(r.status)}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span><span className="text-muted-foreground">Template:</span> {r.template_name}</span>
                {r.metadata?.job_title && (
                  <span><span className="text-muted-foreground">Poste:</span> {r.metadata.job_title}</span>
                )}
              </div>
              {r.error_message && (
                <p className="text-xs text-red-600 break-words">{r.error_message}</p>
              )}
              <div className="flex justify-end pt-1 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setToDelete(r)}
                >
                  <Trash2 size={14} className="mr-1" /> Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'entrée d'historique pour{" "}
              <span className="font-medium text-foreground">{toDelete?.recipient_email}</span>{" "}
              ({toDelete?.template_name}) sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
