import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, FileUp, CheckCircle2, XCircle, Eye, Users, Clock, Sparkles, ExternalLink } from "lucide-react";

interface Process {
  id: string; candidate_name: string; candidate_email: string; status: string;
  current_step: number; invited_at: string; user_id: string | null;
}
interface Step { id: string; step_order: number; step_key: string; title: string; status: string; }
interface Doc { id: string; doc_type: string; file_name: string; file_path: string; status: string; uploaded_at: string; }
interface Contract { id: string; contract_file_name: string; contract_file_path: string; signed_at: string | null; signature_url: string | null; uploaded_at: string; }

const DOC_LABELS: Record<string, string> = {
  cni: "CNI / Passeport", rib: "RIB / Mobile Money",
  diplome: "Diplômes", photo_casier: "Photo + Casier", contrat_signe: "Contrat signé", autre: "Autre",
};

export default function OnboardingAdminTab({ readOnly = false }: { readOnly?: boolean } = {}) {
  const [loading, setLoading] = useState(true);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selected, setSelected] = useState<Process | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("onboarding_processes").select("*").order("invited_at", { ascending: false });
    setProcesses((data || []) as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openProcess = async (p: Process) => {
    setSelected(p);
    const [{ data: s }, { data: d }, { data: c }] = await Promise.all([
      supabase.from("onboarding_steps").select("*").eq("process_id", p.id).order("step_order"),
      supabase.from("onboarding_documents").select("*").eq("process_id", p.id).order("uploaded_at", { ascending: false }),
      supabase.from("onboarding_contracts").select("*").eq("process_id", p.id).order("uploaded_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setSteps((s || []) as any); setDocs((d || []) as any); setContract((c || null) as any);
  };

  const refreshDetail = async () => { if (selected) await openProcess(selected); };

  const reviewDoc = async (docId: string, status: "valide" | "refuse", reason?: string) => {
    const { error } = await supabase.from("onboarding_documents").update({
      status, rejection_reason: reason || null, reviewed_at: new Date().toISOString(),
    }).eq("id", docId);
    if (error) return toast.error(error.message);
    toast.success(status === "valide" ? "Document validé" : "Document refusé");
    refreshDetail();
  };

  const updateStep = async (stepId: string, status: string) => {
    const { error } = await supabase.from("onboarding_steps").update({
      status: status as any, completed_at: status === "valide" ? new Date().toISOString() : null,
    }).eq("id", stepId);
    if (error) return toast.error(error.message);
    toast.success("Étape mise à jour");
    refreshDetail();
  };

  const uploadContract = async (file: File) => {
    if (!selected) return;
    setUploadingContract(true);
    try {
      const path = `${selected.id}/contract_${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from("onboarding-files").upload(path, file);
      if (upErr) throw upErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("onboarding_contracts").insert({
        process_id: selected.id, contract_file_name: file.name, contract_file_path: path, uploaded_by: user!.id,
      });
      if (error) throw error;
      // Push to SharePoint
      supabase.functions.invoke("sync-onboarding-file", {
        body: { process_id: selected.id, storage_path: path, file_name: file.name, kind: "contract" },
      }).catch(() => { /* silent */ });
      toast.success("Contrat déposé");
      refreshDetail();
    } catch (e: any) { toast.error(e.message); } finally { setUploadingContract(false); }
  };

  const generateContract = async () => {
    if (!selected) return;
    setUploadingContract(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: { process_id: selected.id },
      });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
      toast.success("Contrat généré et déposé dans SharePoint");
      refreshDetail();
    } catch (e: any) { toast.error(e.message); } finally { setUploadingContract(false); }
  };

  const downloadFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("onboarding-files").createSignedUrl(path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const filtered = processes.filter(p =>
    !search || p.candidate_name.toLowerCase().includes(search.toLowerCase()) ||
    p.candidate_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Onboarding ({processes.length})</h3>
        </div>
        <Input placeholder="Rechercher candidat..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Button size="sm" variant="outline" onClick={load}>Actualiser</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          Aucun dossier d'onboarding.
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(p => (
            <Card key={p.id} className="p-4 flex items-center justify-between gap-4 hover:shadow-md transition cursor-pointer" onClick={() => openProcess(p)}>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{p.candidate_name}</div>
                <div className="text-xs text-muted-foreground">{p.candidate_email}</div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant={p.status === "complete" ? "default" : "outline"}>{p.status}</Badge>
                {!p.user_id && <Badge variant="outline" className="text-amber-600 border-amber-300"><Clock className="h-3 w-3 mr-1" />Pas inscrit</Badge>}
                <span className="text-muted-foreground">Étape {p.current_step}/7</span>
              </div>
              <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] -m-6 mb-0 p-6 rounded-t-lg">
            <DialogTitle className="text-white">{selected?.candidate_name}</DialogTitle>
            <p className="text-cyan-100 text-sm">{selected?.candidate_email}</p>
          </DialogHeader>

          <div className="space-y-6 pt-6">
            {/* Steps */}
            <section>
              <h4 className="font-semibold mb-3 text-sm">Étapes</h4>
              <div className="space-y-2">
                {steps.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                    <div className="text-sm">
                      <span className="text-xs text-muted-foreground mr-2">#{s.step_order}</span>
                      {s.title}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.status === "valide" ? "default" : "outline"} className="text-xs">{s.status}</Badge>
                      {!readOnly && s.status !== "valide" && (
                        <Button size="sm" variant="outline" onClick={() => updateStep(s.id, "valide")}>
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Contract */}
            <section>
              <h4 className="font-semibold mb-3 text-sm">Contrat</h4>
              {contract ? (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">{contract.contract_file_name}</div>
                    <Button size="sm" variant="outline" onClick={() => downloadFile(contract.contract_file_path)}>Voir</Button>
                  </div>
                  {contract.signed_at ? (
                    <div className="flex items-center gap-2 text-emerald-600 text-xs">
                      <CheckCircle2 className="h-4 w-4" /> Signé le {new Date(contract.signed_at).toLocaleDateString("fr-FR")}
                      {contract.signature_url && <img src={contract.signature_url} alt="sig" className="h-12 ml-2 bg-white border rounded p-1" />}
                    </div>
                  ) : (
                    <Badge variant="outline">En attente de signature</Badge>
                  )}
                </Card>
              ) : readOnly ? (
                <p className="text-xs text-muted-foreground">Aucun contrat déposé.</p>
              ) : (
                <div className="space-y-2">
                  <Button onClick={generateContract} disabled={uploadingContract} className="bg-gradient-to-r from-primary to-[#007aa3]">
                    {uploadingContract ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Générer le contrat automatiquement
                  </Button>
                  <div className="text-xs text-muted-foreground">ou déposer un PDF :</div>
                  <label className="block">
                    <input type="file" accept=".pdf" className="hidden" disabled={uploadingContract}
                      onChange={(e) => e.target.files?.[0] && uploadContract(e.target.files[0])} />
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-md text-sm cursor-pointer hover:bg-muted/80 border">
                      <FileUp className="h-4 w-4" /> Déposer un contrat (PDF)
                    </span>
                  </label>
                </div>
              )}
            </section>

            {/* Documents */}
            <section>
              <h4 className="font-semibold mb-3 text-sm">Documents candidat</h4>
              {docs.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun document téléversé.</p>
              ) : (
                <div className="space-y-2">
                  {docs.map(d => (
                    <Card key={d.id} className="p-3 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">{DOC_LABELS[d.doc_type] || d.doc_type}</div>
                        <div className="text-sm truncate">{d.file_name}</div>
                      </div>
                      <Badge variant={d.status === "valide" ? "default" : d.status === "refuse" ? "destructive" : "outline"} className="text-xs">{d.status}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => downloadFile(d.file_path)}><Eye className="h-3 w-3" /></Button>
                      {!readOnly && d.status !== "valide" && (
                        <Button size="sm" variant="outline" onClick={() => reviewDoc(d.id, "valide")}>
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                      )}
                      {!readOnly && d.status !== "refuse" && (
                        <Button size="sm" variant="outline" onClick={() => {
                          const r = prompt("Raison du refus ?");
                          if (r) reviewDoc(d.id, "refuse", r);
                        }}>
                          <XCircle className="h-3 w-3" />
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
