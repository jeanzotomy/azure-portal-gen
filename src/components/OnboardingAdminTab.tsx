import { useEffect, useState, useCallback, useRef } from"react";
import { supabase } from"@/integrations/supabase/client";
import { Card } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Progress } from"@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from"@/components/ui/dialog";
import { Textarea } from"@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { toast } from"sonner";
import { Loader2, FileUp, CheckCircle2, XCircle, Eye, Users, Clock, Sparkles, ExternalLink, Send, MessageSquare, Search, X } from"lucide-react";
import { OnboardingMessagesPanel } from "@/components/onboarding/OnboardingMessagesPanel";

interface Process {
 id: string; candidate_name: string; candidate_email: string; status: string;
 current_step: number; invited_at: string; user_id: string | null;
}
interface Step { id: string; step_order: number; step_key: string; title: string; status: string; }
interface Doc { id: string; doc_type: string; file_name: string; file_path: string; status: string; uploaded_at: string; }
interface Contract { id: string; contract_file_name: string; contract_file_path: string; signed_at: string | null; signature_url: string | null; uploaded_at: string; }

const DOC_LABELS: Record<string, string> = {
 cni:"CNI / Passeport", rib:"RIB / Mobile Money",
 diplome:"Diplômes", photo_casier:"Photo + Casier", contrat_signe:"Contrat signé", autre:"Autre",
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
 const [statusFilter, setStatusFilter] = useState<string>("all");
 const [registrationFilter, setRegistrationFilter] = useState<string>("all");
 const [messagesOnly, setMessagesOnly] = useState(false);
 const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
 const [rejectDoc, setRejectDoc] = useState<Doc | null>(null);
 const [rejectReason, setRejectReason] = useState("");
 const [adminUserId, setAdminUserId] = useState<string | null>(null);
 const [resendingInvite, setResendingInvite] = useState(false);
 const messagesSectionRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  supabase.auth.getUser().then(({ data }) => setAdminUserId(data.user?.id ?? null));
 }, []);

 const resendInvite = async () => {
  if (!selected) return;
  setResendingInvite(true);
  try {
   const { data, error } = await supabase.functions.invoke("onboarding-invite", {
    body: { process_id: selected.id },
   });
   if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
   toast.success("Invitation renvoyée au candidat");
  } catch (e: any) {
   toast.error(e.message || "Échec de l'envoi");
  } finally {
   setResendingInvite(false);
  }
 };

 const load = useCallback(async () => {
 setLoading(true);
 const [{ data: procs }, { data: msgs }] = await Promise.all([
  supabase.from("onboarding_processes").select("*").eq("kind","onboarding").order("invited_at", { ascending: false }),
  (supabase as any).from("onboarding_messages").select("process_id"),
 ]);
 setProcesses((procs || []) as any);
 const counts: Record<string, number> = {};
 (msgs || []).forEach((m: any) => { counts[m.process_id] = (counts[m.process_id] || 0) + 1; });
 setMessageCounts(counts);
 setLoading(false);
 }, []);

 useEffect(() => { load(); }, [load]);

 const openProcess = async (p: Process, scrollToMessages = false) => {
 setSelected(p);
 const [{ data: s }, { data: d }, { data: c }] = await Promise.all([
 supabase.from("onboarding_steps").select("*").eq("process_id", p.id).order("step_order"),
 supabase.from("onboarding_documents").select("*").eq("process_id", p.id).order("uploaded_at", { ascending: false }),
 supabase.from("onboarding_contracts").select("*").eq("process_id", p.id).order("uploaded_at", { ascending: false }).limit(1).maybeSingle(),
 ]);
 setSteps((s || []) as any); setDocs((d || []) as any); setContract((c || null) as any);
 if (scrollToMessages) {
  setTimeout(() => messagesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
 }
 };

 const refreshDetail = async () => { if (selected) await openProcess(selected); };

 const reviewDoc = async (docId: string, status:"valide"|"refuse", reason?: string) => {
 const { error } = await supabase.from("onboarding_documents").update({
 status, rejection_reason: reason || null, reviewed_at: new Date().toISOString(),
 }).eq("id", docId);
 if (error) return toast.error(error.message);
 toast.success(status ==="valide"?"Document validé":"Document refusé");
 refreshDetail();
 };

 const updateStep = async (stepId: string, status: string) => {
 const { error } = await supabase.from("onboarding_steps").update({
 status: status as any, completed_at: status ==="valide"? new Date().toISOString() : null,
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
 body: { process_id: selected.id, storage_path: path, file_name: file.name, kind:"contract"},
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
 window.open(data.signedUrl,"_blank");
 };

 const filtered = processes.filter(p => {
  const q = search.trim().toLowerCase();
  const matchesSearch = !q
   || p.candidate_name.toLowerCase().includes(q)
   || p.candidate_email.toLowerCase().includes(q);
  const matchesStatus = statusFilter === "all" || p.status === statusFilter;
  const matchesRegistration =
   registrationFilter === "all"
   || (registrationFilter === "registered" && !!p.user_id)
   || (registrationFilter === "not_registered" && !p.user_id);
  const matchesMessages = !messagesOnly || (messageCounts[p.id] || 0) > 0;
  return matchesSearch && matchesStatus && matchesRegistration && matchesMessages;
 });

 const hasActiveFilters = search || statusFilter !== "all" || registrationFilter !== "all" || messagesOnly;
 const resetFilters = () => {
  setSearch(""); setStatusFilter("all"); setRegistrationFilter("all"); setMessagesOnly(false);
 };

 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between gap-3 flex-wrap">
  <div className="flex items-center gap-2">
   <Users className="h-5 w-5 text-primary"/>
   <h3 className="font-semibold">Onboarding ({filtered.length}{filtered.length !== processes.length && `/${processes.length}`})</h3>
  </div>
  <Button size="sm" variant="outline" onClick={load}>Actualiser</Button>
 </div>

 {/* Barre de recherche + filtres */}
 <Card className="p-3 flex flex-wrap items-center gap-2">
  <div className="relative flex-1 min-w-[220px]">
   <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
   <Input
    placeholder="Rechercher par nom ou email..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="pl-8"
   />
  </div>
  <Select value={statusFilter} onValueChange={setStatusFilter}>
   <SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
   <SelectContent>
    <SelectItem value="all">Tous les statuts</SelectItem>
    <SelectItem value="en_cours">En cours</SelectItem>
    <SelectItem value="complete">Complète</SelectItem>
   </SelectContent>
  </Select>
  <Select value={registrationFilter} onValueChange={setRegistrationFilter}>
   <SelectTrigger className="w-[160px]"><SelectValue placeholder="Inscription" /></SelectTrigger>
   <SelectContent>
    <SelectItem value="all">Tous</SelectItem>
    <SelectItem value="registered">Inscrit</SelectItem>
    <SelectItem value="not_registered">Pas inscrit</SelectItem>
   </SelectContent>
  </Select>
  <Button
   size="sm"
   variant={messagesOnly ? "default" : "outline"}
   onClick={() => setMessagesOnly(v => !v)}
   className={messagesOnly ? "bg-primary text-primary-foreground" : ""}
  >
   <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
   Avec messages
  </Button>
  {hasActiveFilters && (
   <Button size="sm" variant="ghost" onClick={resetFilters}>
    <X className="h-3.5 w-3.5 mr-1" /> Réinitialiser
   </Button>
  )}
 </Card>

 {loading ? (
 <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin"/></div>
 ) : filtered.length === 0 ? (
 <Card className="p-10 text-center text-muted-foreground text-sm">
  {hasActiveFilters ? "Aucun candidat ne correspond aux filtres." : "Aucun dossier d'onboarding."}
 </Card>
 ) : (
 <div className="grid gap-3">
 {filtered.map(p => {
  const msgCount = messageCounts[p.id] || 0;
  return (
  <Card key={p.id} className="p-4 flex items-center justify-between gap-4 hover:shadow-md transition cursor-pointer" onClick={() => openProcess(p)}>
   <div className="flex-1 min-w-0">
    <div className="font-medium">{p.candidate_name}</div>
    <div className="text-xs text-muted-foreground">{p.candidate_email}</div>
   </div>
   <div className="flex items-center gap-2 text-xs">
    <Badge variant={p.status === "complete" ? "default" : "outline"}>{p.status}</Badge>
    {!p.user_id && <Badge variant="outline" className="text-amber-600 border-amber-300"><Clock className="h-3 w-3 mr-1"/>Pas inscrit</Badge>}
    <span className="text-muted-foreground">Étape {p.current_step}/7</span>
   </div>
   <Button
    size="sm"
    variant={msgCount > 0 ? "default" : "outline"}
    onClick={(e) => { e.stopPropagation(); openProcess(p, true); }}
    className={msgCount > 0 ? "bg-primary text-primary-foreground" : ""}
    title="Ouvrir la conversation"
   >
    <MessageSquare className="h-3.5 w-3.5" />
    {msgCount > 0 && <span className="ml-1 text-[10px] font-semibold">{msgCount}</span>}
   </Button>
   <Button size="sm" variant="ghost"><Eye className="h-4 w-4"/></Button>
  </Card>
  );
 })}
 </div>
 )}

 <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
 <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
  <DialogHeader>
  <DialogTitle>{selected?.candidate_name}</DialogTitle>
  <p className="text-cyan-100 text-sm">{selected?.candidate_email}</p>
  {!readOnly && selected && (
   <div className="pt-2">
     <Button
      size="sm"
      variant="outline"
      onClick={resendInvite}
      disabled={resendingInvite}
      className="bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
     >
      {resendingInvite ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
      Renvoyer l'invitation onboarding
     </Button>
   </div>
  )}
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
 <Badge variant={s.status ==="valide"?"default":"outline"} className="text-xs">{s.status}</Badge>
 {!readOnly && s.status !=="valide"&& (
 <Button size="sm"variant="outline"onClick={() => updateStep(s.id,"valide")}>
 <CheckCircle2 className="h-3 w-3"/>
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
 <Button size="sm"variant="outline"onClick={() => downloadFile(contract.contract_file_path)}>Voir</Button>
 </div>
 {contract.signed_at ? (
 <div className="flex items-center gap-2 text-emerald-600 text-xs">
 <CheckCircle2 className="h-4 w-4"/> Signé le {new Date(contract.signed_at).toLocaleDateString("fr-FR")}
 {contract.signature_url && <img src={contract.signature_url} alt="sig"className="h-12 ml-2 bg-white border rounded p-1"/>}
 </div>
 ) : (
 <Badge variant="outline">En attente de signature</Badge>
 )}
 </Card>
 ) : readOnly ? (
 <p className="text-xs text-muted-foreground">Aucun contrat déposé.</p>
 ) : (
 <div className="space-y-2">
 <Button onClick={generateContract} disabled={uploadingContract} className="bg-gradient-primary-deep text-primary-foreground">
 {uploadingContract ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Sparkles className="h-4 w-4 mr-2"/>}
 Générer le contrat automatiquement
 </Button>
 <div className="text-xs text-muted-foreground">ou déposer un PDF :</div>
 <label className="block">
 <input type="file"accept=".pdf"className="hidden"disabled={uploadingContract}
 onChange={(e) => e.target.files?.[0] && uploadContract(e.target.files[0])} />
 <span className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-md text-sm cursor-pointer hover:bg-muted/80 border">
 <FileUp className="h-4 w-4"/> Déposer un contrat (PDF)
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
 <Badge variant={d.status ==="valide"?"default": d.status ==="refuse"?"destructive":"outline"} className="text-xs">{d.status}</Badge>
 <Button size="sm"variant="ghost"onClick={() => downloadFile(d.file_path)}><Eye className="h-3 w-3"/></Button>
 {!readOnly && d.status !=="valide"&& (
 <Button size="sm"variant="outline"onClick={() => reviewDoc(d.id,"valide")}>
 <CheckCircle2 className="h-3 w-3"/>
 </Button>
 )}
 {!readOnly && d.status !=="refuse"&& (
 <Button size="sm"variant="outline"onClick={() => {
 setRejectDoc(d);
 setRejectReason("");
 }}>
 <XCircle className="h-3 w-3"/>
 </Button>
 )}
 </Card>
 ))}
 </div>
  )}
  </section>

  {/* Messagerie candidat ↔ RH */}
  {selected && adminUserId && (
   <section ref={messagesSectionRef}>
    <OnboardingMessagesPanel processId={selected.id} asAdmin currentUserId={adminUserId} />
   </section>
  )}
  </div>
  </DialogContent>
  </Dialog>

 <Dialog open={!!rejectDoc} onOpenChange={(o) => !o && setRejectDoc(null)}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>Refuser le document</DialogTitle>
 <DialogDescription>
 Indiquez la raison du refus. Elle sera communiquée au candidat.
 </DialogDescription>
 </DialogHeader>
 <Textarea
 value={rejectReason}
 onChange={(e) => setRejectReason(e.target.value)}
 placeholder="Ex: Document illisible, mauvaise pièce, expiré..." rows={4}
 />
 <DialogFooter>
 <Button variant="outline"onClick={() => setRejectDoc(null)}>Annuler</Button>
 <Button
 variant="destructive" disabled={!rejectReason.trim()}
 onClick={async () => {
 if (!rejectDoc || !rejectReason.trim()) return;
 await reviewDoc(rejectDoc.id,"refuse", rejectReason.trim());
 setRejectDoc(null);
 setRejectReason("");
 }}
 >
 Refuser
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
