import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileSignature, Sparkles, Loader2, Download, RefreshCw, FileUp, CheckCircle2, Clock, Search, Briefcase,
} from "lucide-react";

interface Row {
  process_id: string;
  application_id: string;
  candidate_name: string;
  candidate_email: string;
  job_id: string | null;
  job_title: string | null;
  job_contract_type?: string | null;
  job_location?: string | null;
  job_salary?: string | null;
  job_duration?: string | null;
  job_start_date?: string | null;
  accepted_at: string;
  contract: { id: string; contract_file_path: string; contract_file_name: string; signed_at: string | null } | null;
}

interface FormState {
  job_title: string;
  contract_type: string;
  start_date: string;
  end_date: string;
  duration: string;
  trial_period: string;
  salary: string;
  salary_currency: string;
  benefits: string;
  location: string;
  weekly_hours: string;
  leave_days: string;
  notice_period: string;
  department: string;
  manager_name: string;
  candidate_address: string;
  candidate_id_number: string;
  candidate_birth: string;
  custom_clauses: string;
}

const emptyForm: FormState = {
  job_title: "", contract_type: "CDI", start_date: "", end_date: "", duration: "",
  trial_period: "3 mois", salary: "", salary_currency: "GNF", benefits: "",
  location: "Conakry, Guinée", weekly_hours: "40 heures", leave_days: "30 jours ouvrables / an",
  notice_period: "1 mois (employés) / 3 mois (cadres)", department: "", manager_name: "",
  candidate_address: "", candidate_id_number: "", candidate_birth: "", custom_clauses: "",
};

export default function ContractsTab({ readOnly = false }: { readOnly?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openRow, setOpenRow] = useState<Row | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: procs } = await supabase
      .from("onboarding_processes")
      .select("id, application_id, candidate_name, candidate_email, job_id, created_at")
      .order("created_at", { ascending: false });
    if (!procs?.length) { setRows([]); setLoading(false); return; }

    const procIds = procs.map(p => p.id);
    const jobIds = Array.from(new Set(procs.map(p => p.job_id).filter(Boolean) as string[]));

    const [{ data: contracts }, { data: jobs }] = await Promise.all([
      supabase.from("onboarding_contracts").select("id, process_id, contract_file_path, contract_file_name, signed_at").in("process_id", procIds),
      jobIds.length ? supabase.from("job_postings").select("id, title, contract_type, location, salary_range, contract_duration, start_date").in("id", jobIds) : Promise.resolve({ data: [] as any }),
    ]);

    const contractByProc = new Map((contracts || []).map(c => [c.process_id, c]));
    const jobById = new Map<string, any>((jobs || []).map((j: any) => [j.id, j]));

    setRows(procs.map(p => {
      const job = p.job_id ? jobById.get(p.job_id) : null;
      return {
        process_id: p.id,
        application_id: p.application_id,
        candidate_name: p.candidate_name,
        candidate_email: p.candidate_email,
        job_id: p.job_id,
        job_title: job?.title || null,
        job_contract_type: job?.contract_type || null,
        job_location: job?.location || null,
        job_salary: job?.salary_range || null,
        job_duration: job?.contract_duration || null,
        job_start_date: job?.start_date || null,
        accepted_at: p.created_at,
        contract: contractByProc.get(p.id) as any || null,
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openGenerate = (r: Row) => {
    setOpenRow(r);
    setForm({
      ...emptyForm,
      job_title: r.job_title || "",
      contract_type: r.job_contract_type || "CDI",
      location: r.job_location || "Conakry, Guinée",
      salary: r.job_salary || "",
      duration: r.job_duration || "",
      start_date: r.job_start_date || "",
    });
  };

  const submitGenerate = async () => {
    if (!openRow) return;
    if (!form.job_title.trim()) return toast.error("Intitulé du poste requis");
    if (!form.salary.trim()) return toast.error("Salaire requis");
    if (!form.start_date.trim()) return toast.error("Date de début requise");
    if (form.contract_type === "CDD" && !form.end_date.trim()) return toast.error("Date de fin requise pour un CDD");

    setBusy(openRow.process_id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: { process_id: openRow.process_id, ...form },
      });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
      toast.success("Contrat généré et déposé dans SharePoint");
      setOpenRow(null);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const uploadManual = async (processId: string, file: File) => {
    setBusy(processId);
    try {
      const ext = file.name.split(".").pop();
      const path = `${processId}/contract_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("onboarding-files").upload(path, file);
      if (upErr) throw upErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("onboarding_contracts").insert({
        process_id: processId, contract_file_name: file.name, contract_file_path: path, uploaded_by: user!.id,
      });
      if (error) throw error;
      supabase.functions.invoke("sync-onboarding-file", {
        body: { process_id: processId, storage_path: path, file_name: file.name, kind: "contract" },
      }).catch(() => { });
      toast.success("Contrat déposé");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  const download = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from("onboarding-files").download(path);
      if (error || !data) throw error || new Error("Téléchargement impossible");
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = path.split("/").pop() || "contrat.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      toast.error(e.message || "Téléchargement impossible (bloqueur de pub ?)");
    }
  };

  const filtered = rows.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      if (![r.candidate_name, r.candidate_email, r.job_title || ""].some(x => x.toLowerCase().includes(q))) return false;
    }
    if (statusFilter === "none" && r.contract) return false;
    if (statusFilter === "pending" && (!r.contract || r.contract.signed_at)) return false;
    if (statusFilter === "signed" && !r.contract?.signed_at) return false;
    return true;
  });

  const set = (k: keyof FormState) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Contrats des candidats acceptés ({rows.length})</h3>
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Actualiser</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher candidat ou poste..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="none">Sans contrat</SelectItem>
            <SelectItem value="pending">En attente de signature</SelectItem>
            <SelectItem value="signed">Signé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Aucun candidat à afficher.</Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(r => (
            <Card key={r.process_id} className="p-4">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  <div className="font-semibold">{r.candidate_name}</div>
                  <div className="text-xs text-muted-foreground">{r.candidate_email}</div>
                  <div className="text-xs mt-1 flex items-center gap-1 text-muted-foreground">
                    <Briefcase className="h-3 w-3" /> {r.job_title || "Poste inconnu"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {r.contract?.signed_at ? (
                    <Badge className="bg-emerald-500"><CheckCircle2 className="h-3 w-3 mr-1" />Signé le {new Date(r.contract.signed_at).toLocaleDateString("fr-FR")}</Badge>
                  ) : r.contract ? (
                    <Badge variant="outline" className="border-amber-400 text-amber-700"><Clock className="h-3 w-3 mr-1" />En attente de signature</Badge>
                  ) : (
                    <Badge variant="outline">Aucun contrat</Badge>
                  )}
                  <div className="flex gap-2 flex-wrap justify-end">
                    {r.contract && (
                      <Button size="sm" variant="outline" onClick={() => download(r.contract!.contract_file_path)}>
                        <Download className="h-4 w-4 mr-1" />Télécharger
                      </Button>
                    )}
                    {!readOnly && !r.contract && (
                      <>
                        <Button size="sm" onClick={() => openGenerate(r)} disabled={busy === r.process_id}
                          className="bg-gradient-to-r from-primary to-[#007aa3]">
                          {busy === r.process_id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                          Générer
                        </Button>
                        <label>
                          <input type="file" accept=".pdf" className="hidden" disabled={busy === r.process_id}
                            onChange={e => e.target.files?.[0] && uploadManual(r.process_id, e.target.files[0])} />
                          <span className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-md border bg-muted hover:bg-muted/80 cursor-pointer">
                            <FileUp className="h-4 w-4" />PDF manuel
                          </span>
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!openRow} onOpenChange={(v) => !v && setOpenRow(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] -m-6 mb-2 p-6 rounded-t-lg">
            <DialogTitle className="text-white">Générer le contrat - {openRow?.candidate_name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <section>
              <h4 className="font-semibold text-sm mb-2 text-primary">Poste & Contrat</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Intitulé du poste *</Label><Input value={form.job_title} onChange={e => set("job_title")(e.target.value)} /></div>
                <div>
                  <Label>Type de contrat *</Label>
                  <Select value={form.contract_type} onValueChange={set("contract_type")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CDI">CDI</SelectItem>
                      <SelectItem value="CDD">CDD</SelectItem>
                      <SelectItem value="Stage">Stage</SelectItem>
                      <SelectItem value="Freelance">Freelance / Prestation</SelectItem>
                      <SelectItem value="Apprentissage">Apprentissage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Département</Label><Input value={form.department} onChange={e => set("department")(e.target.value)} placeholder="Cloud & DevOps" /></div>
                <div><Label>Manager / N+1</Label><Input value={form.manager_name} onChange={e => set("manager_name")(e.target.value)} /></div>
                <div><Label>Lieu de travail</Label><Input value={form.location} onChange={e => set("location")(e.target.value)} /></div>
                <div><Label>Heures hebdomadaires</Label><Input value={form.weekly_hours} onChange={e => set("weekly_hours")(e.target.value)} /></div>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-sm mb-2 text-primary">Dates & Durée</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><Label>Date de début *</Label><Input type="date" value={form.start_date} onChange={e => set("start_date")(e.target.value)} /></div>
                <div><Label>Date de fin {form.contract_type === "CDD" && "*"}</Label><Input type="date" value={form.end_date} onChange={e => set("end_date")(e.target.value)} /></div>
                <div><Label>Durée (texte)</Label><Input value={form.duration} onChange={e => set("duration")(e.target.value)} placeholder="6 mois renouvelable" /></div>
                <div><Label>Période d'essai</Label><Input value={form.trial_period} onChange={e => set("trial_period")(e.target.value)} /></div>
                <div><Label>Préavis</Label><Input value={form.notice_period} onChange={e => set("notice_period")(e.target.value)} /></div>
                <div><Label>Congés payés</Label><Input value={form.leave_days} onChange={e => set("leave_days")(e.target.value)} /></div>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-sm mb-2 text-primary">Rémunération</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2"><Label>Salaire brut mensuel *</Label><Input value={form.salary} onChange={e => set("salary")(e.target.value)} placeholder="5 000 000" /></div>
                <div>
                  <Label>Devise</Label>
                  <Select value={form.salary_currency} onValueChange={set("salary_currency")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GNF">GNF</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="XOF">XOF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3"><Label>Avantages (transport, logement, primes...)</Label><Textarea rows={2} value={form.benefits} onChange={e => set("benefits")(e.target.value)} /></div>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-sm mb-2 text-primary">Identité du salarié (optionnel)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><Label>N° pièce d'identité</Label><Input value={form.candidate_id_number} onChange={e => set("candidate_id_number")(e.target.value)} /></div>
                <div><Label>Date de naissance</Label><Input type="date" value={form.candidate_birth} onChange={e => set("candidate_birth")(e.target.value)} /></div>
                <div><Label>Adresse</Label><Input value={form.candidate_address} onChange={e => set("candidate_address")(e.target.value)} /></div>
              </div>
            </section>

            <section>
              <h4 className="font-semibold text-sm mb-2 text-primary">Clauses particulières (optionnel)</h4>
              <Textarea rows={3} value={form.custom_clauses} onChange={e => set("custom_clauses")(e.target.value)} placeholder="Mobilité, télétravail, non-concurrence post-contractuelle..." />
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRow(null)}>Annuler</Button>
            <Button onClick={submitGenerate} disabled={busy === openRow?.process_id} className="bg-gradient-to-r from-primary to-[#007aa3]">
              {busy === openRow?.process_id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Générer le contrat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
