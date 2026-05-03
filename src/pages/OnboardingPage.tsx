import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, Clock, FileSignature, FileUp, GraduationCap,
  Laptop, Users, PartyPopper, Sparkles, Download, Loader2, AlertCircle,
} from "lucide-react";
import { SignaturePad } from "@/components/SignaturePad";

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
interface Doc { id: string; doc_type: string; file_name: string; status: string; uploaded_at: string; }
interface Contract { id: string; contract_file_path: string; contract_file_name: string; signed_at: string | null; signature_url: string | null; }

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [process, setProcess] = useState<Process | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { navigate("/auth?redirect=/onboarding"); return; }
    setUser(u);

    const { data: proc } = await supabase
      .from("onboarding_processes").select("*").eq("user_id", u.id).maybeSingle();

    if (!proc) {
      // Try linking by email if user_id not yet set
      const { data: byEmail } = await supabase
        .from("onboarding_processes").select("*").eq("candidate_email", u.email).maybeSingle();
      if (byEmail && !byEmail.user_id) {
        await supabase.from("onboarding_processes").update({ user_id: u.id }).eq("id", byEmail.id);
        setProcess({ ...byEmail, user_id: u.id } as any);
      } else if (byEmail) {
        setProcess(byEmail as any);
      } else {
        setLoading(false); return;
      }
    } else {
      setProcess(proc as any);
    }

    const procId = (proc?.id) || (await supabase.from("onboarding_processes").select("id").eq("candidate_email", u.email).maybeSingle()).data?.id;
    if (!procId) { setLoading(false); return; }

    const [{ data: stepsData }, { data: docsData }, { data: contractData }] = await Promise.all([
      supabase.from("onboarding_steps").select("*").eq("process_id", procId).order("step_order"),
      supabase.from("onboarding_documents").select("*").eq("process_id", procId).order("uploaded_at", { ascending: false }),
      supabase.from("onboarding_contracts").select("*").eq("process_id", procId).order("uploaded_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setSteps((stepsData || []) as any);
    setDocs((docsData || []) as any);
    setContract((contractData || null) as any);
    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

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
      toast.success("Contrat signé !");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const downloadContract = async () => {
    if (!contract) return;
    const { data, error } = await supabase.storage.from("onboarding-files").createSignedUrl(contract.contract_file_path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-cyan-50">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );

  if (!process) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-cyan-50 p-6">
      <Card className="max-w-md p-8 text-center space-y-4">
        <AlertCircle className="h-12 w-12 mx-auto text-amber-500" />
        <h2 className="text-xl font-bold">Aucun onboarding actif</h2>
        <p className="text-muted-foreground text-sm">
          Aucun dossier d'intégration n'a été trouvé pour <strong>{user?.email}</strong>.
          Si vous venez d'être accepté(e), patientez quelques minutes ou contactez le RH.
        </p>
        <Button onClick={() => navigate("/portal")} variant="outline">Retour au portail</Button>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-primary to-[#007aa3] text-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-cyan-100 text-sm mb-2">
            <Sparkles className="h-4 w-4" /> Portail Onboarding
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Bienvenue, {process.candidate_name} 👋</h1>
          <p className="text-cyan-50 mb-6">Suivez votre intégration pas à pas et finalisez votre arrivée chez CloudMature.</p>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 max-w-md">
            <div className="flex justify-between text-sm mb-2">
              <span>Progression globale</span>
              <span className="font-bold">{completedCount}/{steps.length} étapes</span>
            </div>
            <Progress value={progressPct} className="h-2 bg-white/20" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="space-y-4">
          {steps.map((step, idx) => {
            const Icon = STEP_ICONS[step.step_key] || Circle;
            const isActive = activeStepId === step.id;
            const isDone = step.status === "valide";
            const isReview = step.status === "en_revision";
            return (
              <Card key={step.id} className={`overflow-hidden transition-all ${isActive ? "ring-2 ring-primary shadow-lg" : ""}`}>
                <button
                  onClick={() => setActiveStepId(isActive ? null : step.id)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/30 transition"
                >
                  <div className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    isDone ? "bg-emerald-100 text-emerald-600" :
                    isReview ? "bg-amber-100 text-amber-600" :
                    "bg-primary/10 text-primary"
                  }`}>
                    {isDone ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono">Étape {idx + 1}</span>
                      {isDone && <Badge className="bg-emerald-500">Validé</Badge>}
                      {isReview && <Badge className="bg-amber-500">En révision</Badge>}
                      {step.status === "a_faire" && <Badge variant="outline">À faire</Badge>}
                      {step.status === "refuse" && <Badge variant="destructive">À refaire</Badge>}
                    </div>
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </button>

                {isActive && (
                  <div className="border-t bg-muted/20 p-6">
                    <StepContent
                      step={step}
                      contract={contract}
                      docs={docs}
                      uploading={uploading}
                      onUploadDoc={handleDocUpload}
                      onSignContract={handleContractSign}
                      onDownloadContract={downloadContract}
                      onMarkDone={() => updateStepStatus(step.id, "valide")}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepContent({ step, contract, docs, uploading, onUploadDoc, onSignContract, onDownloadContract, onMarkDone }: any) {
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

  if (step.step_key === "training") return (
    <div className="space-y-4">
      <p className="text-sm">📚 Modules de formation interne (à venir).</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {["Sécurité IT", "Outils internes", "Culture CloudMature", "RGPD & confidentialité"].map(m => (
          <div key={m} className="p-4 bg-white rounded-lg border flex items-center justify-between">
            <span className="text-sm font-medium">{m}</span>
            <Badge variant="outline">Bientôt</Badge>
          </div>
        ))}
      </div>
      {step.status !== "valide" && <Button variant="outline" onClick={onMarkDone}>Marquer comme vu</Button>}
    </div>
  );

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
