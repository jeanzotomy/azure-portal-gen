import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, Clock, FileSignature, FileUp, GraduationCap,
  Laptop, Users, PartyPopper, Sparkles, Download, Loader2, AlertCircle, RefreshCw, Lock,
  XCircle, ShieldAlert, ChevronLeft, ChevronRight,
} from "lucide-react";
import { SignaturePad } from "@/components/SignaturePad";
import { MediaCapsuleList } from "@/components/hr/TrainingMediaEditor";
import type { User as SupaUser } from "@supabase/supabase-js";

const STEP_ICONS: Record<string, any> = {
  welcome: Sparkles, contract: FileSignature, documents: FileUp,
  training: GraduationCap, it_account: Laptop, team_meet: Users, day_one: PartyPopper,
};

const DOC_TYPES = [
  { key: "cni", label: "CNI / Passeport (recto-verso)" },
  { key: "rib", label: "RIB / Mobile Money" },
  { key: "diplome", label: "Diplômes & certificats" },
  { key: "photo_casier", label: "Photo d'identité + extrait de casier" },
];

interface Process { id: string; candidate_name: string; candidate_email: string; status: string; current_step: number; }
interface Step { id: string; step_order: number; step_key: string; title: string; description: string; status: string; data: any; }
interface Doc { id: string; doc_type: string; file_name: string; file_path: string; status: string; uploaded_at: string; }
interface Contract { id: string; contract_file_path: string; contract_file_name: string; signed_at: string | null; signature_url: string | null; }
interface AssignedTraining { id: string; training_id: string; completed_at: string | null; quiz_score: number | null; quiz_passed: boolean | null; quiz_submitted_at: string | null; training: { title: string; description: string | null; url: string | null; duration_minutes: number | null; category: string | null; content: any | null; quiz: any | null; passing_score: number } | null; }

export default function OnboardingTab({ user }: { user: SupaUser }) {
  const [loading, setLoading] = useState(true);
  const [process, setProcess] = useState<Process | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [contractStatus, setContractStatus] = useState<{ ok: boolean; reason?: string; solution?: string } | null>(null);
  const [contractChecking, setContractChecking] = useState(false);
  const [trainings, setTrainings] = useState<AssignedTraining[]>([]);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let { data: proc } = await supabase
      .from("onboarding_processes").select("*").eq("user_id", user.id).maybeSingle();
    if (!proc) {
      const { data: byEmail } = await supabase
        .from("onboarding_processes").select("*").eq("candidate_email", user.email!).maybeSingle();
      if (byEmail) {
        if (!byEmail.user_id) {
          await supabase.from("onboarding_processes").update({ user_id: user.id }).eq("id", byEmail.id);
        }
        proc = { ...byEmail, user_id: user.id };
      }
    }
    if (!proc) { setProcess(null); setLoading(false); return; }
    setProcess(proc as any);

    const [{ data: stepsData }, { data: docsData }, { data: contractData }, { data: trainingsData }] = await Promise.all([
      supabase.from("onboarding_steps").select("*").eq("process_id", proc.id).order("step_order"),
      supabase.from("onboarding_documents").select("*").eq("process_id", proc.id).order("uploaded_at", { ascending: false }),
      supabase.from("onboarding_contracts").select("*").eq("process_id", proc.id).order("uploaded_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("onboarding_assigned_trainings").select("id, training_id, completed_at, quiz_score, quiz_passed, quiz_submitted_at, course_page, quiz_page, quiz_draft_answers, quiz_answers, training:trainings(title, description, url, duration_minutes, category, content, quiz, passing_score)").eq("process_id", proc.id),
    ]);
    setSteps((stepsData || []) as any);
    setDocs((docsData || []) as any);
    setContract((contractData || null) as any);
    setTrainings((trainingsData || []) as any);
    setLoading(false);

    // Vérifier l'accessibilité réelle du fichier contrat (signed URL)
    if (contractData?.contract_file_path) {
      setContractChecking(true);
      try {
        const { data: signed, error: sErr } = await supabase.storage
          .from("onboarding-files")
          .createSignedUrl(contractData.contract_file_path, 60);
        if (sErr || !signed?.signedUrl) {
          setContractStatus({
            ok: false,
            reason: "Fichier introuvable dans le stockage sécurisé.",
            solution: "Contactez le service RH pour qu'il régénère votre contrat.",
          });
        } else {
          setContractStatus({ ok: true });
        }
      } catch {
        setContractStatus({
          ok: false,
          reason: "Impossible de vérifier l'accès au fichier.",
          solution: "Vérifiez votre connexion internet puis cliquez sur Actualiser.",
        });
      } finally {
        setContractChecking(false);
      }
    } else {
      setContractStatus(null);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Notification quand le contrat passe de "En préparation/Indisponible" → "Téléchargement disponible"
  const prevContractReadyRef = useRef<boolean | null>(null);
  const notifiedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const isReady = !!(contract && contractStatus?.ok === true && !contract.signed_at);
    const prev = prevContractReadyRef.current;
    if (prev === false && isReady && contract) {
      const key = `contract_ready_${contract.id}`;
      const alreadyNotified = (() => {
        try { return sessionStorage.getItem(key) === "1"; } catch { return false; }
      })();
      if (notifiedKeyRef.current !== key && !alreadyNotified) {
        notifiedKeyRef.current = key;
        try { sessionStorage.setItem(key, "1"); } catch {}
        toast.success("Votre contrat est prêt !", {
          description: "Le téléchargement est désormais disponible. Vous pouvez le signer.",
          duration: 10000,
          action: {
            label: "Télécharger",
            onClick: () => downloadContract(),
          },
        });
        if (typeof window !== "undefined" && "Notification" in window) {
          const showBrowserNotif = () => {
            try {
              new Notification("Contrat disponible", {
                body: "Votre contrat est prêt à être téléchargé et signé.",
                icon: "/favicon.ico",
              });
            } catch {}
          };
          if (Notification.permission === "granted") showBrowserNotif();
          else if (Notification.permission !== "denied") {
            Notification.requestPermission().then((p) => { if (p === "granted") showBrowserNotif(); });
          }
        }
      }
    }
    if (contract) prevContractReadyRef.current = isReady;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, contractStatus]);

  // Polling automatique tant que le contrat n'est pas disponible/signé
  useEffect(() => {
    if (!process) return;
    const needsPoll = !contract || (contractStatus?.ok === false) || (contract && !contractStatus);
    if (!needsPoll) return;
    const id = setInterval(() => { load(); }, 20000);
    return () => clearInterval(id);
  }, [process, contract, contractStatus, load]);


  const completedCount = steps.filter(s => s.status === "valide").length;
  const progressPct = steps.length ? Math.round((completedCount / steps.length) * 100) : 0;

  const updateStepStatus = async (stepId: string, status: string) => {
    const { error } = await supabase.from("onboarding_steps").update({ status: status as any, completed_at: status === "valide" ? new Date().toISOString() : null }).eq("id", stepId);
    if (error) return toast.error(error.message);
    toast.success("Étape mise à jour");
    load();
  };

  const handleDocUpload = async (docType: string, file: File) => {
    if (!process) return;
    setUploading(docType);
    try {
      const ext = file.name.split(".").pop();
      const path = `${process.id}/${docType}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("onboarding-files").upload(path, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("onboarding_documents").insert({
        process_id: process.id, doc_type: docType as any,
        file_name: file.name, file_path: path, file_size: file.size, mime_type: file.type, status: "en_revision",
      });
      if (dbErr) throw dbErr;
      // Fire-and-forget SharePoint sync
      supabase.functions.invoke("sync-onboarding-file", {
        body: { process_id: process.id, storage_path: path, file_name: file.name, kind: "document", doc_type: docType },
      }).catch(() => { /* silent */ });
      toast.success("Document téléversé – en attente de validation");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setUploading(null); }
  };

  const handleContractSign = async (blob: Blob) => {
    if (!process || !contract) return;
    try {
      const path = `${process.id}/signature_${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from("onboarding-files").upload(path, blob);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("onboarding-files").getPublicUrl(path);
      const { error } = await supabase.from("onboarding_contracts").update({
        signature_url: publicUrl, signed_at: new Date().toISOString(),
      }).eq("id", contract.id);
      if (error) throw error;
      const contractStep = steps.find(s => s.step_key === "contract");
      if (contractStep) await updateStepStatus(contractStep.id, "en_revision");
      // Push signature to SharePoint
      supabase.functions.invoke("sync-onboarding-file", {
        body: { process_id: process.id, storage_path: path, file_name: `signature-${Date.now()}.png`, kind: "signature" },
      }).catch(() => { /* silent */ });
      toast.success("Contrat signé !");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const downloadContract = async () => {
    if (!contract) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage.from("onboarding-files").download(contract.contract_file_path);
      if (error || !data) throw error || new Error("not_found");
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = contract.contract_file_name || "contrat.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setContractStatus({ ok: true });
      toast.success("Contrat téléchargé");
    } catch (e: any) {
      const msg = (e?.message || "").toLowerCase();
      let reason = "Erreur inconnue lors du téléchargement.";
      let solution = "Réessayez dans quelques instants ou contactez le RH.";
      if (msg.includes("not_found") || msg.includes("not found") || msg.includes("object")) {
        reason = "Le fichier du contrat est introuvable sur le serveur.";
        solution = "Demandez au RH de régénérer le contrat depuis le portail admin.";
      } else if (msg.includes("network") || msg.includes("failed to fetch")) {
        reason = "Problème de connexion réseau.";
        solution = "Vérifiez votre connexion internet puis réessayez.";
      } else if (msg.includes("permission") || msg.includes("denied") || msg.includes("unauthorized")) {
        reason = "Vous n'êtes pas autorisé(e) à accéder à ce fichier.";
        solution = "Reconnectez-vous puis réessayez. Si le problème persiste, contactez le RH.";
      } else if (msg.includes("blocked")) {
        reason = "Téléchargement bloqué par votre navigateur ou une extension.";
        solution = "Désactivez les bloqueurs de publicités/popups, puis réessayez.";
      }
      setContractStatus({ ok: false, reason, solution });
      toast.error(reason);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
  );

  if (!process) return (
    <Card className="max-w-md mx-auto p-8 text-center space-y-4 mt-10">
      <AlertCircle className="h-12 w-12 mx-auto text-amber-500" />
      <h2 className="text-xl font-bold">Aucun onboarding actif</h2>
      <p className="text-muted-foreground text-sm">
        Aucun dossier d'intégration n'a été trouvé pour <strong>{user.email}</strong>.
        Si vous venez d'être accepté(e), patientez quelques minutes ou contactez le RH.
      </p>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-[#007aa3] text-white p-6 shadow-md">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-cyan-100 text-sm mb-2">
              <Sparkles className="h-4 w-4" /> Portail Onboarding
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Bienvenue, {process.candidate_name} 👋</h1>
            <p className="text-cyan-50 text-sm">Suivez votre intégration pas à pas.</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="bg-white/10 text-white border-white/30 hover:bg-white/20">
            <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
          </Button>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 max-w-md mt-5">
          <div className="flex justify-between text-sm mb-2">
            <span>Progression globale</span>
            <span className="font-bold">{completedCount}/{steps.length} étapes</span>
          </div>
          <Progress value={progressPct} className="h-2 bg-white/20" />
        </div>
      </div>

      {/* Section Contrat – mise en avant + état d'accessibilité */}
      {(() => {
        const contractStep = steps.find(s => s.step_key === "contract");
        if (!contractStep) return null;
        const signed = !!contract?.signed_at;
        const accessible = contract && contractStatus?.ok !== false;
        const inaccessible = contract && contractStatus?.ok === false;

        let badgeLabel = "En préparation";
        let badgeClass = "bg-amber-500";
        let title = "Contrat en cours de préparation";
        let description = "Le service RH prépare votre contrat. Vous serez notifié(e) dès qu'il sera disponible.";
        let cardClass = "border-amber-200 bg-amber-50/40";
        let iconBg = "bg-amber-400 text-white";

        if (signed) {
          badgeLabel = "Signé"; badgeClass = "bg-emerald-500";
          title = "Votre contrat est signé ✅";
          description = `Signé le ${new Date(contract!.signed_at!).toLocaleDateString("fr-FR")}. Vous pouvez le télécharger à tout moment.`;
          cardClass = "border-emerald-300 bg-emerald-50/40";
          iconBg = "bg-emerald-500 text-white";
        } else if (contractChecking) {
          badgeLabel = "Vérification…"; badgeClass = "bg-slate-500";
          title = "Vérification de l'accès au contrat";
          description = "Nous vérifions que votre contrat est bien accessible…";
          cardClass = "border-slate-200 bg-slate-50/40";
          iconBg = "bg-slate-400 text-white";
        } else if (inaccessible) {
          badgeLabel = "Indisponible"; badgeClass = "bg-red-500";
          title = "Contrat momentanément indisponible";
          description = contractStatus?.reason || "Le fichier ne peut pas être ouvert pour le moment.";
          cardClass = "border-red-300 bg-red-50/40";
          iconBg = "bg-red-500 text-white";
        } else if (accessible) {
          badgeLabel = "Téléchargement disponible"; badgeClass = "bg-primary";
          title = "Votre contrat est prêt à signer";
          description = "Téléchargez votre contrat, lisez-le attentivement, puis signez électroniquement.";
          cardClass = "border-primary/40 bg-gradient-to-br from-primary/5 via-white to-cyan-50 shadow-lg";
          iconBg = "bg-primary text-white";
        }

        return (
          <Card className={`overflow-hidden border-2 ${cardClass}`}>
            <div className="p-6 flex flex-col md:flex-row md:items-center gap-4">
              <div className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center ${iconBg}`}>
                {inaccessible ? <XCircle className="h-7 w-7" /> : contractChecking ? <Loader2 className="h-7 w-7 animate-spin" /> : <FileSignature className="h-7 w-7" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className={badgeClass}>{badgeLabel}</Badge>
                  <span className="text-xs text-muted-foreground font-mono">Contrat de travail</span>
                  {contract?.contract_file_name && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">· {contract.contract_file_name}</span>
                  )}
                </div>
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
                {inaccessible && contractStatus?.solution && (
                  <div className="mt-3 flex items-start gap-2 text-sm bg-white/70 border border-red-200 rounded-md p-3">
                    <ShieldAlert className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-red-700">Que faire&nbsp;?</span>{" "}
                      <span className="text-red-900">{contractStatus.solution}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 md:flex-shrink-0">
                {contract && (
                  <Button variant="outline" onClick={downloadContract} disabled={downloading || contractChecking}>
                    {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    {downloading ? "Téléchargement…" : "Télécharger"}
                  </Button>
                )}
                {inaccessible && (
                  <Button variant="outline" onClick={load}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Réessayer
                  </Button>
                )}
                {accessible && !signed && (
                  <Button className="bg-gradient-to-r from-primary to-[#007aa3]" onClick={() => setActiveStepId(contractStep.id)}>
                    <FileSignature className="h-4 w-4 mr-2" /> Démarrer la signature
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })()}

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const Icon = STEP_ICONS[step.step_key] || Circle;
          const isActive = activeStepId === step.id;
          const isDone = step.status === "valide";
          const isReview = step.status === "en_revision";
          const contractSigned = !!contract?.signed_at;
          // Lock all steps except welcome & contract until contract is signed
          const isLocked = !contractSigned && step.step_key !== "welcome" && step.step_key !== "contract";
          return (
            <Card key={step.id} className={`overflow-hidden transition-all ${isActive ? "ring-2 ring-primary shadow-lg" : ""} ${isLocked ? "opacity-60" : ""}`}>
              <button
                onClick={() => {
                  if (isLocked) {
                    toast.info("Veuillez d'abord signer votre contrat pour débloquer cette étape.");
                    return;
                  }
                  setActiveStepId(isActive ? null : step.id);
                }}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/30 transition"
              >
                <div className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  isLocked ? "bg-muted text-muted-foreground" :
                  isDone ? "bg-emerald-100 text-emerald-600" :
                  isReview ? "bg-amber-100 text-amber-600" :
                  "bg-primary/10 text-primary"
                }`}>
                  {isLocked ? <Lock className="h-6 w-6" /> : isDone ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground font-mono">Étape {idx + 1}</span>
                    {isLocked && <Badge variant="outline" className="border-amber-400 text-amber-700"><Lock className="h-3 w-3 mr-1" />Verrouillé</Badge>}
                    {!isLocked && isDone && <Badge className="bg-emerald-500">Validé</Badge>}
                    {!isLocked && isReview && <Badge className="bg-amber-500">En révision</Badge>}
                    {!isLocked && step.status === "a_faire" && <Badge variant="outline">À faire</Badge>}
                    {!isLocked && step.status === "refuse" && <Badge variant="destructive">À refaire</Badge>}
                  </div>
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {isLocked ? "Disponible après la signature du contrat." : step.description}
                  </p>
                </div>
              </button>

              {isActive && !isLocked && (
                <div className="border-t bg-muted/20 p-6">
                  <StepContent
                    step={step}
                    contract={contract}
                    docs={docs}
                    trainings={trainings}
                    uploading={uploading}
                    onUploadDoc={handleDocUpload}
                    onSignContract={handleContractSign}
                    onDownloadContract={downloadContract}
                    onMarkDone={() => updateStepStatus(step.id, "valide")}
                    onMarkTrainingDone={async (id: string) => {
                      const { error } = await supabase.from("onboarding_assigned_trainings")
                        .update({ completed_at: new Date().toISOString() }).eq("id", id);
                      if (error) toast.error(error.message); else { toast.success("Formation marquée comme suivie"); load(); }
                    }}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StepContent({ step, contract, docs, trainings = [], uploading, onUploadDoc, onSignContract, onDownloadContract, onMarkDone, onMarkTrainingDone }: any) {
  if (step.step_key === "welcome") return (
    <div className="space-y-4">
      <p className="text-sm">🎬 Découvrez l'équipe, nos valeurs et votre rôle dans cette aventure.</p>
      <div className="aspect-video bg-gradient-to-br from-primary/20 to-cyan-200/30 rounded-lg flex items-center justify-center text-muted-foreground">
        Vidéo de bienvenue (à venir)
      </div>
      {step.status !== "valide" && <Button onClick={onMarkDone}>J'ai pris connaissance</Button>}
    </div>
  );

  if (step.step_key === "contract") return (
    <div className="space-y-4">
      {contract ? (
        <>
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <FileSignature className="h-8 w-8 text-primary" />
              <div>
                <div className="font-medium text-sm">{contract.contract_file_name}</div>
                <div className="text-xs text-muted-foreground">Contrat à signer</div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onDownloadContract}>
              <Download className="h-4 w-4 mr-2" /> Télécharger
            </Button>
          </div>
          {contract.signed_at ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                <CheckCircle2 className="h-5 w-5" /> Signé le {new Date(contract.signed_at).toLocaleDateString("fr-FR")}
              </div>
              {contract.signature_url && <img src={contract.signature_url} alt="signature" className="mt-3 h-20 bg-white p-2 rounded border" />}
            </div>
          ) : (
            <div>
              <Label className="text-sm font-medium mb-2 block">Signez ci-dessous :</Label>
              <SignaturePad onSave={onSignContract} />
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Le contrat sera bientôt déposé par le service RH.</p>
        </div>
      )}
    </div>
  );

  if (step.step_key === "documents") return (
    <div className="space-y-4">
      {DOC_TYPES.map(dt => {
        const userDocs = docs.filter((d: Doc) => d.doc_type === dt.key);
        const validated = userDocs.find((d: Doc) => d.status === "valide");
        return (
          <div key={dt.key} className="p-4 bg-white rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-sm">{dt.label}</div>
              {validated && <Badge className="bg-emerald-500">Validé</Badge>}
            </div>
            {userDocs.length > 0 && (
              <div className="text-xs text-muted-foreground mb-2 space-y-1">
                {userDocs.map((d: Doc) => (
                  <div key={d.id} className="flex items-center gap-2">
                    <span>📎 {d.file_name}</span>
                    <Badge variant="outline" className="text-[10px]">{d.status}</Badge>
                  </div>
                ))}
              </div>
            )}
            <label className="block">
              <input
                type="file" className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                disabled={uploading === dt.key}
                onChange={(e) => e.target.files?.[0] && onUploadDoc(dt.key, e.target.files[0])}
              />
              <span className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
                {uploading === dt.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {validated ? "Remplacer" : "Téléverser"}
              </span>
            </label>
          </div>
        );
      })}
    </div>
  );

  if (step.step_key === "training") {
    const allDone = trainings.length > 0 && trainings.every((t: any) => t.completed_at);
    return (
      <div className="space-y-4">
        {trainings.length === 0 ? (
          <div className="p-6 bg-white rounded-lg border text-center text-sm text-muted-foreground">
            <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Aucune formation assignée pour le moment. Le service RH vous attribuera vos modules dès que possible.
          </div>
        ) : (
          <div className="space-y-3">
            {trainings.map((t: any) => (
              <TrainingPlayer key={t.id} assigned={t} onComplete={() => onMarkTrainingDone(t.id)} />
            ))}
          </div>
        )}
        {allDone && step.status !== "valide" && (
          <Button onClick={onMarkDone}>Valider l'étape formation</Button>
        )}
      </div>
    );
  }

  if (step.step_key === "it_account") return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Votre compte SI sera créé par notre équipe IT. Vous recevrez vos identifiants par email sécurisé.</p>
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
        <Clock className="h-5 w-5 flex-shrink-0" /> En attente de provisioning par l'équipe IT
      </div>
    </div>
  );

  if (step.step_key === "team_meet") return (
    <div className="space-y-3">
      <p className="text-sm">Une visio de bienvenue sera planifiée avec votre manager.</p>
      <div className="p-4 bg-white rounded-lg border text-sm text-muted-foreground">
        📅 Date à confirmer – vous recevrez une invitation Outlook.
      </div>
    </div>
  );

  if (step.step_key === "day_one") return (
    <div className="space-y-3">
      <p className="text-sm">🎉 Tout est prêt pour votre premier jour !</p>
      <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
        <li>Adresse : Conakry, Guinée</li>
        <li>Horaire d'arrivée : 9h00</li>
        <li>Demandez la réception RH</li>
      </ul>
    </div>
  );

  return null;
}

/* =================== TRAINING PLAYER (paginated course + paginated QCM) =================== */
function TrainingPlayer({ assigned, onComplete }: { assigned: any; onComplete: () => void }) {
  const t = assigned.training;
  const content = t?.content || {};
  const modules: any[] = content.modules || [];
  const hasContent = modules.length > 0 || !!content.introduction || !!content.conclusion || (content.intro_media?.length || 0) > 0 || (content.conclusion_media?.length || 0) > 0 || (content.standalone_media?.length || 0) > 0;
  const hasQuiz = !!(t?.quiz?.questions?.length);
  const passingScore = t?.passing_score || 70;

  // Build course pages: intro -> each module -> conclusion -> resources
  const coursePages: { kind: string; data?: any }[] = [];
  if (content.objectives?.length || content.introduction || content.intro_media?.length || content.standalone_media?.length) coursePages.push({ kind: "intro" });
  modules.forEach((m, i) => coursePages.push({ kind: "module", data: { ...m, idx: i } }));
  if (content.conclusion || content.resources?.length || content.conclusion_media?.length) coursePages.push({ kind: "conclusion" });

  const [expanded, setExpanded] = useState(false);
  const [coursePage, setCoursePage] = useState<number>(Math.min(assigned.course_page ?? 0, Math.max(0, coursePages.length - 1)));
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizPage, setQuizPage] = useState<number>(assigned.quiz_page ?? 0);
  const [answers, setAnswers] = useState<Record<number, number>>(() => {
    const draft = assigned.quiz_draft_answers && typeof assigned.quiz_draft_answers === "object" ? assigned.quiz_draft_answers : {};
    // normalize keys to numbers
    const out: Record<number, number> = {};
    Object.entries(draft).forEach(([k, v]) => { if (typeof v === "number") out[Number(k)] = v; });
    return out;
  });
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(
    assigned.quiz_score != null ? { score: assigned.quiz_score, passed: !!assigned.quiz_passed } : null,
  );

  const questions: any[] = hasQuiz ? t.quiz.questions : [];
  const currentQ = questions[quizPage];
  const currentAnswered = currentQ ? answers[quizPage] != null : false;
  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i] != null);

  // Debounced save of progress (course page, quiz page, draft answers)
  const lastSavedRef = useRef<string>("");
  useEffect(() => {
    if (assigned.completed_at) return;
    const payload = { course_page: coursePage, quiz_page: quizPage, quiz_draft_answers: answers, last_activity_at: new Date().toISOString() };
    const key = JSON.stringify({ c: coursePage, q: quizPage, a: answers });
    if (key === lastSavedRef.current) return;
    const handle = setTimeout(async () => {
      lastSavedRef.current = key;
      await (supabase.from("onboarding_assigned_trainings") as any).update(payload).eq("id", assigned.id);
    }, 600);
    return () => clearTimeout(handle);
  }, [coursePage, quizPage, answers, assigned.id, assigned.completed_at]);

  const submitQuiz = async () => {
    if (!hasQuiz) return;
    if (!allAnswered) {
      toast.error("Répondez à toutes les questions");
      return;
    }
    setSubmitting(true);
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct_index) correct++; });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= passingScore;
    const { error } = await (supabase.from("onboarding_assigned_trainings") as any).update({
      quiz_score: score, quiz_passed: passed, quiz_answers: answers, quiz_submitted_at: new Date().toISOString(),
      completed_at: passed ? new Date().toISOString() : null,
      quiz_draft_answers: passed ? {} : answers,
      quiz_page: passed ? 0 : quizPage,
    }).eq("id", assigned.id);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setResult({ score, passed });
    setShowResults(true);
    if (passed) {
      toast.success(`QCM réussi (${score}%)`);
    } else {
      toast.error(`Score ${score}% — minimum requis ${passingScore}%. Vous pouvez réessayer.`);
    }
  };

  const closeResults = () => {
    setShowResults(false);
    setQuizOpen(false);
    if (result?.passed) onComplete();
  };

  const retryQuiz = () => {
    setShowResults(false);
    setAnswers({});
    setQuizPage(0);
  };

  const openQuiz = () => {
    // Resume where left: keep draft answers & last quiz page unless already completed
    if (assigned.completed_at) {
      setAnswers({});
      setQuizPage(0);
    }
    setShowResults(false);
    setQuizOpen(true);
  };

  const renderCoursePage = (page: { kind: string; data?: any }) => {
    if (page.kind === "intro") {
      return (
        <div className="space-y-4">
          {content.objectives?.length > 0 && (
            <div>
              <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Objectifs pédagogiques</div>
              <ul className="list-disc list-inside space-y-0.5 text-sm">{content.objectives.map((o: string, i: number) => <li key={i}>{o}</li>)}</ul>
            </div>
          )}
          {content.introduction && (
            <div>
              <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Introduction</div>
              <p className="text-sm leading-relaxed whitespace-pre-line">{content.introduction}</p>
            </div>
          )}
          <MediaCapsuleList items={content.intro_media} />
          <MediaCapsuleList items={content.standalone_media} />
        </div>
      );
    }
    if (page.kind === "module") {
      const m = page.data;
      return (
        <div className="border-l-2 border-primary/30 pl-3 space-y-2">
          <div className="font-semibold text-base">Module {m.idx + 1} — {m.title}</div>
          {m.summary && <p className="text-xs text-muted-foreground italic">{m.summary}</p>}
          {m.sections?.map((s: any, k: number) => (
            <div key={k} className="space-y-1">
              {s.heading && <div className="font-medium text-sm">{s.heading}</div>}
              {s.body && <p className="text-sm leading-relaxed whitespace-pre-line">{s.body}</p>}
            </div>
          ))}
          <MediaCapsuleList items={m.media} />
          {m.example && (
            <div className="bg-primary/5 border border-primary/20 rounded p-2 text-xs">
              <span className="font-semibold">Exemple : </span>{m.example}
            </div>
          )}
          {m.key_points?.length > 0 && (
            <div>
              <div className="font-semibold text-xs uppercase text-muted-foreground mt-1 mb-1">À retenir</div>
              <ul className="text-xs list-disc list-inside space-y-0.5">{m.key_points.map((p: string, j: number) => <li key={j}>{p}</li>)}</ul>
            </div>
          )}
        </div>
      );
    }
    if (page.kind === "conclusion") {
      return (
        <div className="space-y-4">
          {content.conclusion && (
            <div>
              <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Conclusion</div>
              <p className="text-sm leading-relaxed whitespace-pre-line">{content.conclusion}</p>
            </div>
          )}
          <MediaCapsuleList items={content.conclusion_media} />
          {content.resources?.length > 0 && (
            <div>
              <div className="font-semibold text-xs uppercase text-muted-foreground mb-1">Ressources complémentaires</div>
              <ul className="text-xs list-disc list-inside space-y-0.5">{content.resources.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const courseProgress = coursePages.length > 0 ? Math.round(((coursePage + 1) / coursePages.length) * 100) : 0;
  const quizProgress = questions.length > 0 ? Math.round(((quizPage + 1) / questions.length) * 100) : 0;
  const onLastCoursePage = coursePage === coursePages.length - 1;

  return (
    <div className={`bg-white rounded-lg border ${assigned.completed_at ? "border-emerald-200" : ""}`}>
      <div className="p-4 flex items-start gap-3">
        <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${assigned.completed_at ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"}`}>
          {assigned.completed_at ? <CheckCircle2 className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{t?.title}</span>
            {t?.duration_minutes && <Badge variant="outline" className="text-[10px]">{t.duration_minutes} min</Badge>}
            {t?.category && <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>}
            {hasQuiz && <Badge variant="outline" className="text-[10px]">QCM {questions.length}q · ≥{passingScore}%</Badge>}
            {result && <Badge variant={result.passed ? "default" : "destructive"} className="text-[10px]">{result.passed ? "Réussi" : "Échec"} {result.score}%</Badge>}
          </div>
          {t?.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
          <div className="flex gap-2 mt-2 flex-wrap">
            {hasContent && (
              <Button size="sm" variant="outline" onClick={() => { setExpanded(v => !v); setCoursePage(0); }}>
                {expanded ? "Masquer le cours" : "Suivre le cours"}
              </Button>
            )}
            {t?.url && (
              <a href={t.url} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline"><Download className="h-3 w-3 mr-1" />Ressource externe</Button>
              </a>
            )}
            {hasQuiz && !assigned.completed_at && (
              <Button size="sm" onClick={openQuiz} className="bg-gradient-to-r from-primary to-[#007aa3]">
                <GraduationCap className="h-3 w-3 mr-1" />{result ? "Réessayer le QCM" : "Passer le QCM"}
              </Button>
            )}
            {!hasQuiz && !assigned.completed_at && (
              <Button size="sm" variant="outline" onClick={onComplete}>
                <CheckCircle2 className="h-3 w-3 mr-1" />Marquer comme suivi
              </Button>
            )}
          </div>
        </div>
      </div>

      {expanded && hasContent && coursePages.length > 0 && (
        <div className="border-t bg-muted/20">
          <div className="px-4 pt-3 flex items-center justify-between gap-3">
            <div className="text-xs font-medium text-muted-foreground">
              Page {coursePage + 1} / {coursePages.length}
            </div>
            <Progress value={courseProgress} className="h-1.5 flex-1 max-w-xs" />
          </div>
          <div className="p-4 min-h-[180px] text-sm">
            {renderCoursePage(coursePages[coursePage])}
          </div>
          <div className="px-4 pb-4 flex items-center justify-between gap-2 border-t pt-3">
            <Button size="sm" variant="outline" onClick={() => setCoursePage(p => Math.max(0, p - 1))} disabled={coursePage === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
            {!onLastCoursePage ? (
              <Button size="sm" onClick={() => setCoursePage(p => Math.min(coursePages.length - 1, p + 1))} className="bg-gradient-to-r from-primary to-[#007aa3]">
                Suivant <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : hasQuiz && !assigned.completed_at ? (
              <Button size="sm" onClick={openQuiz} className="bg-gradient-to-r from-primary to-[#007aa3]">
                Passer au QCM <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : !hasQuiz && !assigned.completed_at ? (
              <Button size="sm" onClick={onComplete} className="bg-gradient-to-r from-primary to-[#007aa3]">
                Terminer la formation <CheckCircle2 className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Badge variant="outline" className="text-[10px]">Fin du cours</Badge>
            )}
          </div>
        </div>
      )}

      {quizOpen && hasQuiz && currentQ && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setQuizOpen(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary to-[#007aa3] p-4 rounded-t-lg">
              <h3 className="text-white font-semibold">QCM — {t.title}</h3>
              <p className="text-cyan-100 text-xs">Score minimum requis : {passingScore}%</p>
            </div>
            <div className="px-4 pt-3 flex items-center justify-between gap-3">
              <div className="text-xs font-medium text-muted-foreground">
                Question {quizPage + 1} / {questions.length}
              </div>
              <Progress value={quizProgress} className="h-1.5 flex-1 max-w-xs" />
            </div>
            <div className="p-4 space-y-3 min-h-[200px]">
              <div className="font-medium text-sm">{quizPage + 1}. {currentQ.question}</div>
              <div className="space-y-1.5">
                {currentQ.options.map((opt: string, j: number) => (
                  <label key={j} className={`flex items-center gap-2 p-2.5 border rounded cursor-pointer text-sm ${answers[quizPage] === j ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`}>
                    <input type="radio" name={`q-${quizPage}`} checked={answers[quizPage] === j} onChange={() => setAnswers({ ...answers, [quizPage]: j })} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-4 border-t flex items-center justify-between gap-2">
              <Button size="sm" variant="outline" onClick={() => setQuizPage(p => Math.max(0, p - 1))} disabled={quizPage === 0 || submitting}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
              </Button>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setQuizOpen(false)} disabled={submitting}>Annuler</Button>
                {quizPage < questions.length - 1 ? (
                  <Button size="sm" onClick={() => setQuizPage(p => p + 1)} disabled={!currentAnswered} className="bg-gradient-to-r from-primary to-[#007aa3]">
                    Suivant <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={submitQuiz} disabled={!allAnswered || submitting} className="bg-gradient-to-r from-primary to-[#007aa3]">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Soumettre
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

