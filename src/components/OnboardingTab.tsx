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
  XCircle, ShieldAlert, ChevronLeft, ChevronRight, Bot, Brain, Timer, PenLine, Youtube,
} from "lucide-react";

const fmtTime = (s: number) => {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};
import { SignaturePad } from "@/components/SignaturePad";
import { MediaCapsuleList } from "@/components/hr/TrainingMediaEditor";
import { GamificationWidget } from "@/components/onboarding/GamificationWidget";
import { TrainingTutor } from "@/components/onboarding/TrainingTutor";
import { TrainingComments } from "@/components/onboarding/TrainingComments";
import { MentionsBell } from "@/components/onboarding/MentionsBell";
import { CohortActivityFeed } from "@/components/onboarding/CohortActivityFeed";
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
                    userId={user.id}
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

function StepContent({ step, contract, docs, trainings = [], uploading, userId, onUploadDoc, onSignContract, onDownloadContract, onMarkDone, onMarkTrainingDone }: any) {
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
    const gamifKey = trainings.filter((t: any) => t.quiz_passed).length;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-sm">Formations & QCM</h3>
          {userId && <MentionsBell userId={userId} />}
        </div>
        {userId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2"><GamificationWidget userId={userId} refreshKey={gamifKey} /></div>
            <div><CohortActivityFeed /></div>
          </div>
        )}
        {trainings.length === 0 ? (
          <div className="p-6 bg-white rounded-lg border text-center text-sm text-muted-foreground">
            <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Aucune formation assignée pour le moment. Le service RH vous attribuera vos modules dès que possible.
          </div>
        ) : (
          <div className="space-y-3">
            {trainings.map((t: any) => (
              <TrainingPlayer key={t.id} assigned={t} userId={userId} onComplete={() => onMarkTrainingDone(t.id)} />
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
function TrainingPlayer({ assigned, userId, onComplete }: { assigned: any; userId?: string | null; onComplete: () => void }) {
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
  const [tutorOpen, setTutorOpen] = useState(false);
  const [adaptiveQuestions, setAdaptiveQuestions] = useState<any[] | null>(null);
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState<string>("");
  const [loadingAdaptive, setLoadingAdaptive] = useState(false);

  // ---- Lot 3: enriched evaluation state ----
  const [openAnswers, setOpenAnswers] = useState<Record<number, string>>(() => {
    const d = (assigned.quiz_open_answers && typeof assigned.quiz_open_answers === "object") ? assigned.quiz_open_answers : {};
    const out: Record<number, string> = {};
    Object.entries(d).forEach(([k, v]) => { if (typeof v === "string") out[Number(k)] = v; });
    return out;
  });
  const [openGrades, setOpenGrades] = useState<Record<number, { score: number; feedback: string }> | null>(
    assigned.quiz_open_grades && typeof assigned.quiz_open_grades === "object" ? assigned.quiz_open_grades : null,
  );

  // ---- Time tracking (session + per-module) ----
  const initialTotal = assigned.total_seconds ?? 0;
  const initialModuleTimes: Record<string, number> = (assigned.module_times && typeof assigned.module_times === "object") ? assigned.module_times : {};
  const [sessionSeconds, setSessionSeconds] = useState<number>(initialTotal);
  const moduleTimesRef = useRef<Record<string, number>>({ ...initialModuleTimes });
  const [, forceTick] = useState(0);

  // ---- Quiz timer (countdown if quiz.time_limit_minutes is set) ----
  const quizTimeLimitSec = t?.quiz?.time_limit_minutes ? t.quiz.time_limit_minutes * 60 : 0;
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [quizElapsed, setQuizElapsed] = useState(0);
  const quizTimeLeft = quizTimeLimitSec ? Math.max(0, quizTimeLimitSec - quizElapsed) : 0;

  const baseQuestions: any[] = hasQuiz ? t.quiz.questions : [];
  const questions: any[] = adaptiveQuestions ?? baseQuestions;
  const currentQ = questions[quizPage];

  // ---- Shuffle option order per question (stable per session) ----
  const shuffledMapRef = useRef<Record<number, number[]>>({});
  const getOptionOrder = (qIndex: number, q: any) => {
    if (!q?.options) return [];
    if (q.type === "open") return [];
    if (!shuffledMapRef.current[qIndex]) {
      const arr = q.options.map((_: any, i: number) => i);
      // Fisher-Yates
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      shuffledMapRef.current[qIndex] = arr;
    }
    return shuffledMapRef.current[qIndex];
  };

  const isOpen = currentQ?.type === "open";
  const currentAnswered = currentQ
    ? (isOpen ? (openAnswers[quizPage] || "").trim().length > 5 : answers[quizPage] != null)
    : false;
  const allAnswered = questions.length > 0 && questions.every((q, i) =>
    q?.type === "open" ? (openAnswers[i] || "").trim().length > 5 : answers[i] != null,
  );

  // Session timer: increments every second; assigns time to current "context key"
  const expandedRef = useRef(expanded);
  const quizOpenRef = useRef(quizOpen);
  const coursePageRef = useRef(coursePage);
  expandedRef.current = expanded; quizOpenRef.current = quizOpen; coursePageRef.current = coursePage;

  const currentKey = () => {
    if (quizOpenRef.current) return "quiz";
    if (!expandedRef.current) return null;
    const page = coursePages[coursePageRef.current];
    if (!page) return null;
    if (page.kind === "module") return `m${page.data.idx}`;
    return page.kind;
  };

  useEffect(() => {
    if (assigned.completed_at) return;
    const id = setInterval(() => {
      const key = currentKey();
      if (!key) return;
      moduleTimesRef.current[key] = (moduleTimesRef.current[key] || 0) + 1;
      setSessionSeconds(s => s + 1);
      forceTick(n => (n + 1) % 1000);
      if (quizOpenRef.current && quizTimeLimitSec) {
        setQuizElapsed(e => e + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [assigned.completed_at, quizTimeLimitSec]);

  // Debounced save of progress (course page, quiz page, draft answers, times)
  const lastSavedRef = useRef<string>("");
  useEffect(() => {
    if (assigned.completed_at) return;
    if (adaptiveQuestions) return; // never persist adaptive-mode answers
    const payload = {
      course_page: coursePage, quiz_page: quizPage, quiz_draft_answers: answers,
      quiz_open_answers: openAnswers,
      module_times: moduleTimesRef.current, total_seconds: sessionSeconds,
      last_activity_at: new Date().toISOString(),
    };
    const key = JSON.stringify({ c: coursePage, q: quizPage, a: answers, o: openAnswers, s: Math.floor(sessionSeconds / 5) });
    if (key === lastSavedRef.current) return;
    const handle = setTimeout(async () => {
      lastSavedRef.current = key;
      await (supabase.from("onboarding_assigned_trainings") as any).update(payload).eq("id", assigned.id);
    }, 1500);
    return () => clearTimeout(handle);
  }, [coursePage, quizPage, answers, openAnswers, sessionSeconds, assigned.id, assigned.completed_at, adaptiveQuestions]);

  const submitQuiz = async () => {
    if (questions.length === 0) return;
    if (!allAnswered) {
      toast.error("Répondez à toutes les questions");
      return;
    }
    setSubmitting(true);

    // 1) Score MCQ questions
    const mcq = questions.map((q, i) => ({ q, i })).filter(x => x.q?.type !== "open");
    const opens = questions.map((q, i) => ({ q, i })).filter(x => x.q?.type === "open");
    let correct = 0;
    mcq.forEach(({ q, i }) => { if (answers[i] === q.correct_index) correct++; });

    // 2) Grade open questions via AI (if any)
    let openGradesLocal: Record<number, { score: number; feedback: string }> = {};
    if (opens.length > 0) {
      try {
        const { data, error } = await supabase.functions.invoke("training-grade-open", {
          body: {
            questions: opens.map(({ q, i }) => ({
              index: i,
              question: q.question,
              expected: q.expected_answer || q.reference_answer || "",
              answer: openAnswers[i] || "",
            })),
          },
        });
        if (error) throw error;
        (data?.grades || []).forEach((g: any) => {
          openGradesLocal[g.index] = { score: Number(g.score) || 0, feedback: g.feedback || "" };
        });
      } catch (e: any) {
        toast.error("Correction IA indisponible — questions ouvertes notées à 0");
      }
    }
    const openTotal = opens.reduce((s, { i }) => s + (openGradesLocal[i]?.score ?? 0), 0);
    const totalPoints = (correct * 100) + openTotal;
    const score = Math.round(totalPoints / questions.length);
    const passed = score >= passingScore;
    const inAdaptive = !!adaptiveQuestions;
    const quizDuration = quizStartedAt ? Math.round((Date.now() - quizStartedAt) / 1000) : quizElapsed;

    const update: any = inAdaptive
      ? (passed ? { quiz_passed: true, completed_at: new Date().toISOString(), quiz_draft_answers: {}, quiz_page: 0 } : {})
      : {
          quiz_score: score, quiz_passed: passed, quiz_answers: answers, quiz_submitted_at: new Date().toISOString(),
          completed_at: passed ? new Date().toISOString() : null,
          quiz_draft_answers: passed ? {} : answers,
          quiz_page: passed ? 0 : quizPage,
          quiz_open_answers: openAnswers,
          quiz_open_grades: openGradesLocal,
          quiz_time_seconds: quizDuration,
          module_times: moduleTimesRef.current,
          total_seconds: sessionSeconds,
        };

    if (Object.keys(update).length > 0) {
      const { error } = await (supabase.from("onboarding_assigned_trainings") as any).update(update).eq("id", assigned.id);
      if (error) { setSubmitting(false); return toast.error(error.message); }
    }
    setSubmitting(false);
    setOpenGrades(openGradesLocal);
    setResult({ score, passed });
    setShowResults(true);
    if (passed) toast.success(inAdaptive ? `Rattrapage réussi (${score}%) 🎉` : `QCM réussi (${score}%) en ${fmtTime(quizDuration)}`);
    else toast.error(`Score ${score}% — minimum requis ${passingScore}%.`);
  };

  // Auto-submit when countdown hits 0
  useEffect(() => {
    if (!quizOpen || !quizTimeLimitSec) return;
    if (quizTimeLeft === 0 && !showResults && !submitting) {
      toast.error("⏰ Temps écoulé — soumission automatique");
      submitQuiz();
    }
  }, [quizTimeLeft, quizOpen, quizTimeLimitSec, showResults, submitting]);

  const closeResults = () => {
    setShowResults(false);
    setQuizOpen(false);
    setAdaptiveQuestions(null);
    if (result?.passed) onComplete();
  };

  const retryQuiz = () => {
    setShowResults(false);
    setAdaptiveQuestions(null);
    setAnswers({});
    setOpenAnswers({});
    setQuizPage(0);
    shuffledMapRef.current = {};
    setQuizStartedAt(Date.now());
    setQuizElapsed(0);
  };

  const startAdaptive = async () => {
    setLoadingAdaptive(true);
    try {
      const { data, error } = await supabase.functions.invoke("training-adaptive-quiz", {
        body: { assignedId: assigned.id },
      });
      if (error) throw error;
      if (!data?.questions?.length) throw new Error("Aucune question générée");
      setAdaptiveQuestions(data.questions);
      setAdaptiveDifficulty(data.difficulty || "");
      setAnswers({});
      setOpenAnswers({});
      setQuizPage(0);
      shuffledMapRef.current = {};
      setShowResults(false);
      setQuizStartedAt(Date.now());
      setQuizElapsed(0);
      toast.success(`Mode adaptatif activé — ${data.questions.length} questions ciblées (${data.difficulty})`);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la génération du rattrapage");
    } finally {
      setLoadingAdaptive(false);
    }
  };

  const openQuiz = () => {
    if (assigned.completed_at) {
      setAnswers({});
      setOpenAnswers({});
      setQuizPage(0);
    }
    setAdaptiveQuestions(null);
    setShowResults(false);
    shuffledMapRef.current = {};
    setQuizStartedAt(Date.now());
    setQuizElapsed(0);
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
            {hasQuiz && <Badge variant="outline" className="text-[10px]">QCM {baseQuestions.length}q · ≥{passingScore}%</Badge>}
            {adaptiveQuestions && <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-300"><Brain className="h-3 w-3 mr-0.5" />Mode adaptatif {adaptiveDifficulty && `· ${adaptiveDifficulty}`}</Badge>}
            {result && <Badge variant={result.passed ? "default" : "destructive"} className="text-[10px]">{result.passed ? "Réussi" : "Échec"} {result.score}%</Badge>}
          </div>
          {t?.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
          <div className="flex gap-2 mt-2 flex-wrap">
            {hasContent && (
              <Button size="sm" variant="outline" onClick={() => { setExpanded(v => !v); setCoursePage(0); }}>
                {expanded ? "Masquer le cours" : "Suivre le cours"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setTutorOpen(true)} className="border-primary/30 text-primary hover:bg-primary/5">
              <Bot className="h-3 w-3 mr-1" />Tuteur IA
            </Button>
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
            <Badge variant="outline" className="text-[10px] gap-1 font-mono">
              <Timer className="h-3 w-3" />{fmtTime(sessionSeconds)}
            </Badge>
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

      {quizOpen && hasQuiz && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !submitting && (showResults ? closeResults() : setQuizOpen(false))}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary to-[#007aa3] p-4 rounded-t-lg flex items-start justify-between gap-3">
              <div>
                <h3 className="text-white font-semibold">QCM — {t.title}</h3>
                <p className="text-cyan-100 text-xs">Score minimum requis : {passingScore}%</p>
              </div>
              {!showResults && (
                <Badge className={`font-mono text-xs ${quizTimeLimitSec && quizTimeLeft < 30 ? "bg-rose-500 text-white animate-pulse" : "bg-white/20 text-white border-white/30"}`}>
                  <Timer className="h-3 w-3 mr-1" />
                  {quizTimeLimitSec ? fmtTime(quizTimeLeft) : fmtTime(quizElapsed)}
                </Badge>
              )}
            </div>

            {showResults && result ? (
              <>
                <div className="p-5 flex flex-col items-center text-center border-b">
                  <div className={`h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold ${result.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {result.score}%
                  </div>
                  <div className={`mt-3 font-semibold ${result.passed ? "text-emerald-700" : "text-rose-700"}`}>
                    {result.passed ? "🎉 Félicitations, QCM réussi !" : "Score insuffisant"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {questions.filter((q, i) => q?.type !== "open" && answers[i] === q.correct_index).length} / {questions.filter(q => q?.type !== "open").length} bonnes réponses · seuil {passingScore}%
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Timer className="h-3 w-3" /> Quiz terminé en {fmtTime(quizElapsed)} · Session totale {fmtTime(sessionSeconds)}
                  </div>
                </div>

                {/* Per-module time recap */}
                <div className="p-4 border-b bg-muted/20">
                  <div className="font-semibold text-sm mb-2 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Temps passé par module
                  </div>
                  <div className="space-y-1">
                    {coursePages.map((p, idx) => {
                      const key = p.kind === "module" ? `m${p.data.idx}` : p.kind;
                      const sec = moduleTimesRef.current[key] || 0;
                      const label = p.kind === "intro" ? "Introduction" : p.kind === "conclusion" ? "Conclusion" : `Module ${p.data.idx + 1} — ${p.data.title}`;
                      const pct = sessionSeconds ? Math.round((sec / sessionSeconds) * 100) : 0;
                      return (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="flex-1 truncate">{label}</span>
                          <span className="font-mono text-muted-foreground w-16 text-right">{fmtTime(sec)}</span>
                          <div className="w-20 h-1.5 bg-muted rounded overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-2 text-xs pt-1 mt-1 border-t">
                      <span className="flex-1 font-semibold">QCM</span>
                      <span className="font-mono text-muted-foreground w-16 text-right">{fmtTime(moduleTimesRef.current.quiz || quizElapsed)}</span>
                      <div className="w-20" />
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="font-semibold text-sm">Détail des réponses</div>
                  {questions.map((q, i) => {
                    if (q?.type === "open") {
                      const grade = openGrades?.[i];
                      const sc = grade?.score ?? 0;
                      const ok = sc >= 70;
                      return (
                        <div key={i} className={`border rounded p-3 ${ok ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                          <div className="text-sm font-medium mb-2 flex items-center gap-1">
                            <PenLine className="h-3 w-3" />{i + 1}. {q.question}
                            <Badge variant="outline" className="ml-auto text-[10px]">{sc}/100</Badge>
                          </div>
                          <div className="text-xs bg-white/60 rounded p-2 mb-1 whitespace-pre-line">{openAnswers[i] || <em className="text-muted-foreground">(aucune réponse)</em>}</div>
                          {grade?.feedback && <div className="text-xs text-muted-foreground italic">💡 {grade.feedback}</div>}
                          {q.expected_answer && <div className="text-xs text-emerald-700 mt-1">Réponse attendue : {q.expected_answer}</div>}
                        </div>
                      );
                    }
                    const userAns = answers[i];
                    const ok = userAns === q.correct_index;
                    return (
                      <div key={i} className={`border rounded p-3 ${ok ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50"}`}>
                        <div className="text-sm font-medium mb-2">{i + 1}. {q.question}</div>
                        <div className="space-y-1 text-xs">
                          {q.options.map((opt: string, j: number) => {
                            const isCorrect = j === q.correct_index;
                            const isUser = j === userAns;
                            return (
                              <div key={j} className={`flex items-center gap-2 px-2 py-1 rounded ${isCorrect ? "bg-emerald-100 text-emerald-900" : isUser ? "bg-rose-100 text-rose-900" : "text-muted-foreground"}`}>
                                <span className="font-semibold">{isCorrect ? "✓" : isUser ? "✗" : "·"}</span>
                                <span>{opt}</span>
                                {isUser && <span className="ml-auto text-[10px] uppercase opacity-70">votre réponse</span>}
                              </div>
                            );
                          })}
                        </div>
                        {q.explanation && (
                          <div className="mt-2 text-xs text-muted-foreground italic">💡 {q.explanation}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="p-4 border-t flex flex-wrap items-center justify-end gap-2">
                  {!result.passed && (
                    <>
                      <Button size="sm" variant="outline" onClick={retryQuiz}>
                        Réessayer
                      </Button>
                      <Button size="sm" onClick={startAdaptive} disabled={loadingAdaptive} className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white">
                        {loadingAdaptive ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Brain className="h-4 w-4 mr-1" />}
                        Rattrapage IA (3 questions ciblées)
                      </Button>
                    </>
                  )}
                  <Button size="sm" onClick={closeResults} className="bg-gradient-to-r from-primary to-[#007aa3]">
                    Fermer
                  </Button>
                </div>
              </>
            ) : currentQ ? (
              <>
                <div className="px-4 pt-3 flex items-center justify-between gap-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    Question {quizPage + 1} / {questions.length}
                  </div>
                  <Progress value={quizProgress} className="h-1.5 flex-1 max-w-xs" />
                </div>
                <div className="p-4 space-y-3 min-h-[200px]">
                  <div className="font-medium text-sm flex items-start gap-2">
                    <span>{quizPage + 1}. {currentQ.question}</span>
                    {currentQ.type === "open" && <Badge variant="outline" className="text-[10px]"><PenLine className="h-3 w-3 mr-0.5" />Question ouverte</Badge>}
                  </div>
                  {currentQ.youtube_url && currentQ.timestamp_seconds != null && (
                    <a
                      href={`${currentQ.youtube_url}${currentQ.youtube_url.includes("?") ? "&" : "?"}t=${currentQ.timestamp_seconds}s`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                    >
                      <Youtube className="h-3.5 w-3.5" /> Revoir le passage à {fmtTime(currentQ.timestamp_seconds)}
                    </a>
                  )}
                  {isOpen ? (
                    <textarea
                      className="w-full min-h-[120px] border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Rédigez votre réponse (au moins 6 caractères)…"
                      value={openAnswers[quizPage] || ""}
                      onChange={e => setOpenAnswers({ ...openAnswers, [quizPage]: e.target.value })}
                    />
                  ) : (
                    <div className="space-y-1.5">
                      {getOptionOrder(quizPage, currentQ).map((j) => {
                        const opt = currentQ.options[j];
                        return (
                          <label key={j} className={`flex items-center gap-2 p-2.5 border rounded cursor-pointer text-sm ${answers[quizPage] === j ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`}>
                            <input type="radio" name={`q-${quizPage}`} checked={answers[quizPage] === j} onChange={() => setAnswers({ ...answers, [quizPage]: j })} />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
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
              </>
            ) : null}
          </div>
        </div>
      )}

      {userId && assigned.training_id && (
        <TrainingComments trainingId={assigned.training_id} currentUserId={userId} />
      )}

      {tutorOpen && assigned.training_id && (
        <TrainingTutor
          trainingId={assigned.training_id}
          trainingTitle={t?.title || "Formation"}
          onClose={() => setTutorOpen(false)}
        />
      )}
    </div>
  );
}

