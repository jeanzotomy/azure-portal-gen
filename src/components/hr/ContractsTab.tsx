import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  accepted_at: string;
  contract: { id: string; contract_file_path: string; contract_file_name: string; signed_at: string | null } | null;
}

export default function ContractsTab({ readOnly = false }: { readOnly?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
      jobIds.length ? supabase.from("job_postings").select("id, title").in("id", jobIds) : Promise.resolve({ data: [] as any }),
    ]);

    const contractByProc = new Map((contracts || []).map(c => [c.process_id, c]));
    const jobById = new Map<string, string>((jobs || []).map((j: any) => [j.id as string, j.title as string]));

    setRows(procs.map(p => ({
      process_id: p.id,
      application_id: p.application_id,
      candidate_name: p.candidate_name,
      candidate_email: p.candidate_email,
      job_id: p.job_id,
      job_title: p.job_id ? jobById.get(p.job_id) || null : null,
      accepted_at: p.created_at,
      contract: contractByProc.get(p.id) as any || null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async (processId: string) => {
    setBusy(processId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-contract", { body: { process_id: processId } });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
      toast.success("Contrat généré et déposé dans SharePoint");
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
    const { data, error } = await supabase.storage.from("onboarding-files").createSignedUrl(path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
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
                        <Button size="sm" onClick={() => generate(r.process_id)} disabled={busy === r.process_id}
                          className="bg-gradient-to-r from-primary to-[#007aa3]">
                          {busy === r.process_id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                          Générer auto
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
    </div>
  );
}
