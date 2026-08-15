import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadDetailDrawer } from "./LeadDetailDrawer";
import {
  LEAD_PRIORITIES, LEAD_STATUSES, NEAR_RENEWAL, formatDate, priorityMeta, statusLabel,
  type Campaign, type Lead, type LeadPriority, type LeadStatus,
} from "./marketing-shared";
import { exportCsv } from "@/lib/csv-export";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, CalendarClock, Download, KanbanSquare, Plus, Search, Share2, Table2, TrendingUp, Users,
} from "lucide-react";

const ALL = "all";

interface Props { canDelete: boolean }

export function LeadsManager({ canDelete }: Props) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [salesUsers, setSalesUsers] = useState<{ user_id: string; full_name: string | null }[]>([]);
  const [view, setView] = useState<"table" | "kanban">("table");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [renewal, setRenewal] = useState(ALL);
  const [city, setCity] = useState(ALL);
  const [sector, setSector] = useState(ALL);
  const [size, setSize] = useState(ALL);
  const [assignee, setAssignee] = useState(ALL);
  const [campaign, setCampaign] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    const [{ data: leadRows }, { data: campaignRows }, { data: roleRows }] = await Promise.all([
      supabase.from("marketing_leads").select("*").order("created_at", { ascending: false }),
      supabase.from("marketing_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role").in("role", ["admin", "gestionnaire", "agent"]),
    ]);
    setLeads((leadRows as Lead[]) ?? []);
    setCampaigns((campaignRows as Campaign[]) ?? []);
    const ids = [...new Set((roleRows ?? []).map((r) => r.user_id))];
    if (ids.length) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      setSalesUsers((profiles as { user_id: string; full_name: string | null }[]) ?? []);
    }
  };

  useEffect(() => { void load(); }, []);

  // Deep link ?lead=<id>
  useEffect(() => {
    const leadId = searchParams.get("lead");
    if (!leadId || !leads) return;
    const found = leads.find((l) => l.id === leadId);
    if (found) { setSelected(found); setDrawerOpen(true); }
  }, [searchParams, leads]);

  const unique = (key: keyof Lead) =>
    [...new Set((leads ?? []).map((l) => (l[key] as string | null) ?? "").filter(Boolean))].sort();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (leads ?? []).filter((l) => {
      if (priority !== ALL && l.priority !== priority) return false;
      if (status !== ALL && l.status !== status) return false;
      if (renewal !== ALL && l.renewal_timeline !== renewal) return false;
      if (city !== ALL && l.city !== city) return false;
      if (sector !== ALL && l.sector !== sector) return false;
      if (size !== ALL && l.employee_count_range !== size) return false;
      if (assignee !== ALL && (l.assigned_to ?? "none") !== assignee) return false;
      if (campaign !== ALL && (l.campaign_id ?? "none") !== campaign) return false;
      if (from && new Date(l.created_at) < new Date(from)) return false;
      if (to && new Date(l.created_at) > new Date(`${to}T23:59:59`)) return false;
      if (term) {
        const haystack = [
          l.company_name, l.full_name, l.email, l.phone, l.city, l.sector, l.job_title, l.additional_info,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [leads, q, priority, status, renewal, city, sector, size, assignee, campaign, from, to]);

  const kpis = useMemo(() => {
    const all = leads ?? [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const won = all.filter((l) => l.status === "gagne").length;
    return {
      total: all.length,
      urgent: all.filter((l) => l.priority === "urgent").length,
      qualified: all.filter((l) => l.priority === "qualifie").length,
      conversion: all.length ? Math.round((won / all.length) * 100) : 0,
      month: all.filter((l) => new Date(l.created_at) >= monthStart).length,
      nearRenewal: all.filter((l) => l.renewal_timeline && NEAR_RENEWAL.includes(l.renewal_timeline)).length,
    };
  }, [leads]);

  const openLead = (lead: Lead) => { setSelected(lead); setDrawerOpen(true); };

  const onUpdated = (lead: Lead) => {
    setLeads((prev) => (prev ?? []).map((l) => (l.id === lead.id ? lead : l)));
    setSelected(lead);
  };

  const removeLead = async (lead: Lead) => {
    const { error } = await supabase.from("marketing_leads").delete().eq("id", lead.id);
    if (error) { toast.error("Suppression impossible"); return; }
    setLeads((prev) => (prev ?? []).filter((l) => l.id !== lead.id));
    setDrawerOpen(false);
    toast.success("Prospect supprimé");
  };

  const doExport = () => {
    exportCsv(`prospects-${new Date().toISOString().slice(0, 10)}`, filtered.map((l) => ({
      Entreprise: l.company_name, Contact: l.full_name, Fonction: l.job_title ?? "", Email: l.email,
      Telephone: l.phone ?? "", Ville: l.city ?? "", Secteur: l.sector ?? "", Employes: l.employee_count_range ?? "",
      Utilisateurs: l.users_to_cover ?? "", Renouvellement: l.renewal_timeline ?? "",
      Besoins: l.main_needs.join(" | "), Score: l.score, Priorite: priorityMeta(l.priority).label,
      Statut: statusLabel(l.status), Source: l.source, Date: formatDate(l.created_at),
    })));
  };

  const KPI = ({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: string | number; tone?: string }) => (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary", tone)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (leads === null) {
    return <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPI icon={Users} label="Prospects" value={kpis.total} />
        <KPI icon={AlertTriangle} label="Urgents" value={kpis.urgent} tone="bg-destructive/10 text-destructive" />
        <KPI icon={TrendingUp} label="Qualifiés" value={kpis.qualified} tone="bg-amber-500/10 text-amber-600" />
        <KPI icon={TrendingUp} label="Taux de conversion" value={`${kpis.conversion} %`} />
        <KPI icon={CalendarClock} label="Ce mois-ci" value={kpis.month} />
        <KPI icon={CalendarClock} label="Renouvellement < 6 mois" value={kpis.nearRenewal} />
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un prospect…" className="pl-9" />
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as "table" | "kanban")}>
              <TabsList>
                <TabsTrigger value="table" className="gap-1.5"><Table2 className="h-3.5 w-3.5" /> Tableau</TabsTrigger>
                <TabsTrigger value="kanban" className="gap-1.5"><KanbanSquare className="h-3.5 w-3.5" /> Kanban</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={doExport}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
            <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nouveau prospect</Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <FilterSelect label="Priorité" value={priority} onChange={setPriority}
              options={LEAD_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))} />
            <FilterSelect label="Statut" value={status} onChange={setStatus}
              options={LEAD_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
            <FilterSelect label="Renouvellement" value={renewal} onChange={setRenewal}
              options={unique("renewal_timeline").map((v) => ({ value: v, label: v }))} />
            <FilterSelect label="Ville" value={city} onChange={setCity}
              options={unique("city").map((v) => ({ value: v, label: v }))} />
            <FilterSelect label="Secteur" value={sector} onChange={setSector}
              options={unique("sector").map((v) => ({ value: v, label: v }))} />
            <FilterSelect label="Taille" value={size} onChange={setSize}
              options={unique("employee_count_range").map((v) => ({ value: v, label: v }))} />
            <FilterSelect label="Assigné à" value={assignee} onChange={setAssignee}
              options={[{ value: "none", label: "Non assigné" },
                ...salesUsers.map((u) => ({ value: u.user_id, label: u.full_name || u.user_id.slice(0, 8) }))]} />
            <FilterSelect label="Campagne" value={campaign} onChange={setCampaign}
              options={[{ value: "none", label: "Sans campagne" },
                ...campaigns.map((c) => ({ value: c.id, label: c.title }))]} />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Du</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Au</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} prospect(s) affiché(s)</p>
        </CardContent>
      </Card>

      {view === "table" ? (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  {["Entreprise", "Contact", "Fonction", "Ville", "Utilisateurs", "Renouvellement", "Score", "Priorité", "Statut", "Assigné à", "Date"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const pMeta = priorityMeta(l.priority);
                  const urgent = l.priority === "urgent";
                  return (
                    <tr
                      key={l.id}
                      onClick={() => openLead(l)}
                      className={cn(
                        "cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/50",
                        urgent && "border-l-4 border-l-destructive bg-destructive/[0.03]",
                      )}
                    >
                      <td className="px-3 py-2 font-medium text-foreground">{l.company_name}</td>
                      <td className="px-3 py-2">{l.full_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{l.job_title ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{l.city ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{l.users_to_cover ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{l.renewal_timeline ?? "—"}</td>
                      <td className="px-3 py-2 font-semibold">{l.score}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={cn("border", pMeta.className)}>{pMeta.label}</Badge>
                      </td>
                      <td className="px-3 py-2"><Badge variant="secondary">{statusLabel(l.status)}</Badge></td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {salesUsers.find((u) => u.user_id === l.assigned_to)?.full_name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDate(l.created_at)}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={11} className="px-3 py-10 text-center text-muted-foreground">Aucun prospect.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {LEAD_STATUSES.map((s) => {
            const items = filtered.filter((l) => l.status === s.value);
            return (
              <div key={s.value} className="w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{s.label}</h3>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map((l) => {
                    const pMeta = priorityMeta(l.priority);
                    return (
                      <button
                        key={l.id}
                        onClick={() => openLead(l)}
                        className={cn(
                          "w-full rounded-lg border border-border bg-card p-3 text-left transition-shadow hover:shadow-md",
                          l.priority === "urgent" && "border-l-4 border-l-destructive",
                        )}
                      >
                        <p className="font-medium text-foreground">{l.company_name}</p>
                        <p className="text-xs text-muted-foreground">{l.full_name}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline" className={cn("border text-[11px]", pMeta.className)}>{pMeta.label}</Badge>
                          <span className="text-xs text-muted-foreground">Score {l.score}</span>
                        </div>
                      </button>
                    );
                  })}
                  {items.length === 0 && (
                    <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Vide</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LeadDetailDrawer
        lead={selected}
        open={drawerOpen}
        onOpenChange={(v) => {
          setDrawerOpen(v);
          if (!v && searchParams.get("lead")) {
            searchParams.delete("lead");
            setSearchParams(searchParams, { replace: true });
          }
        }}
        salesUsers={salesUsers}
        onUpdated={onUpdated}
      />

      {canDelete && selected && drawerOpen && (
        <div className="fixed bottom-4 left-4 z-50">
          <Button variant="destructive" size="sm" onClick={() => removeLead(selected)}>
            Supprimer ce prospect
          </Button>
        </div>
      )}

      <NewLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(lead) => setLeads((prev) => [lead, ...(prev ?? [])])}
      />
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tous</SelectItem>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function NewLeadDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (lead: Lead) => void }) {
  const [form, setForm] = useState({
    company_name: "", full_name: "", email: "", phone: "", job_title: "", city: "", sector: "",
    employee_count_range: "", users_to_cover: "", renewal_timeline: "", additional_info: "",
  });
  const [priority, setPriority] = useState<LeadPriority>("a_entretenir");
  const [status, setStatus] = useState<LeadStatus>("nouveau");
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.company_name.trim() || !form.full_name.trim() || !form.email.trim()) {
      toast.error("Entreprise, contact et e-mail sont obligatoires");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("marketing_leads")
      .insert({ ...form, source: "manuel", priority, status, consent_given: false })
      .select("*")
      .single();
    setSaving(false);
    if (error || !data) { toast.error("Création impossible"); return; }
    onCreated(data as Lead);
    onOpenChange(false);
    setForm({
      company_name: "", full_name: "", email: "", phone: "", job_title: "", city: "", sector: "",
      employee_count_range: "", users_to_cover: "", renewal_timeline: "", additional_info: "",
    });
    toast.success("Prospect créé");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Nouveau prospect</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ["company_name", "Entreprise *"], ["full_name", "Contact *"], ["email", "E-mail *"],
            ["phone", "Téléphone"], ["job_title", "Fonction"], ["city", "Ville"], ["sector", "Secteur"],
            ["employee_count_range", "Employés"], ["users_to_cover", "Utilisateurs à couvrir"],
            ["renewal_timeline", "Échéance de renouvellement"],
          ] as const).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs">{label}</Label>
              <Input value={form[key]} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label className="text-xs">Priorité</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as LeadPriority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Statut</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.additional_info} onChange={(e) => set("additional_info", e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Créer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
