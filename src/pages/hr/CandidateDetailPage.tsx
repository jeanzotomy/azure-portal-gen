import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast as sonnerToast } from "sonner";
import {
  Mail, Phone, Linkedin, Globe, Briefcase, Calendar, FileText, Download, ArrowLeft,
  Sparkles, Loader2, ThumbsUp, ThumbsDown, MessageSquare, Save, User,
} from "lucide-react";
import { format } from "date-fns";
import type { AppStatus } from "@/lib/recruitment-stats";

const STATUS_LABEL: Record<AppStatus, string> = {
  nouvelle: "Nouvelle", en_revue: "En revue", entretien: "Entretien", acceptee: "Acceptée", refusee: "Refusée",
};
const RECO_LABEL: Record<string, string> = {
  fortement_recommande: "Fortement recommandé", recommande: "Recommandé", a_considerer: "À considérer", non_recommande: "Non recommandé",
};

interface AppDetail {
  id: string; full_name: string; email: string; phone: string | null; linkedin_url: string | null;
  portfolio_url: string | null; cv_path: string; cover_letter_path: string | null; status: AppStatus;
  notes: string | null; tracking_id: string | null; created_at: string; updated_at: string;
  interview_message: string | null; job_id: string; ai_score: number | null; ai_match_percentage: number | null;
  ai_summary: string | null; ai_skills: string[] | null; ai_strengths: string[] | null; ai_weaknesses: string[] | null;
  ai_recommendation: string | null; ai_analyzed_at: string | null; ai_status: string | null;
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith("/admin") ? "/admin" : "/rh";
  const fallback = base === "/admin" ? "/admin?tab=hr-recruitment&gtab=hr-recruitment" : "/rh?tab=recruitment";
  const goBack = () => (location.key !== "default" ? navigate(-1) : navigate(fallback));

  const [app, setApp] = useState<AppDetail | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [pendingInterview, setPendingInterview] = useState(false);
  const [interviewMsg, setInterviewMsg] = useState("");

  const fetchApp = async () => {
    const { data } = await supabase.from("job_applications").select("*").eq("id", id!).maybeSingle();
    if (data) {
      setApp(data as any);
      setNotes((data as any).notes || "");
      const { data: job } = await supabase.from("job_postings").select("title").eq("id", (data as any).job_id).maybeSingle();
      setJobTitle(job?.title || "Offre supprimée");
    }
    setLoading(false);
  };
  useEffect(() => { setLoading(true); void fetchApp(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const changeStatus = async (status: AppStatus, interview_message?: string) => {
    if (!app) return;
    if (status === "entretien" && !interview_message) { setPendingInterview(true); return; }
    const patch: Record<string, unknown> = { status };
    if (interview_message) patch.interview_message = interview_message;
    const { error } = await supabase.from("job_applications").update(patch as any).eq("id", app.id);
    if (error) { sonnerToast.error("Erreur", { description: error.message }); return; }
    sonnerToast.success(status === "entretien" ? "Invitation envoyée" : "Statut mis à jour", {
      description: status !== "nouvelle" ? "Le candidat sera notifié par email." : undefined,
    });
    setPendingInterview(false); setInterviewMsg("");
    void fetchApp();
  };

  const saveNotes = async () => {
    if (!app) return;
    setSaving(true);
    const { error } = await supabase.from("job_applications").update({ notes }).eq("id", app.id);
    setSaving(false);
    if (error) { sonnerToast.error("Erreur", { description: error.message }); return; }
    sonnerToast.success("Notes enregistrées");
    void fetchApp();
  };

  const analyze = async () => {
    if (!app) return;
    setAnalyzing(true);
    const { error, data } = await supabase.functions.invoke("analyze-cv", { body: { application_id: app.id } });
    setAnalyzing(false);
    if (error || (data as any)?.error) { sonnerToast.error("Analyse échouée", { description: error?.message || (data as any)?.error }); return; }
    sonnerToast.success("Analyse terminée");
    void fetchApp();
  };

  const downloadFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("cv-applications").createSignedUrl(path, 60);
    if (error || !data) { sonnerToast.error("Téléchargement impossible"); return; }
    window.open(data.signedUrl, "_blank");
  };

  if (loading) return <div className="max-w-5xl mx-auto py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!app) return (
    <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
      <p className="text-muted-foreground">Cette candidature est introuvable.</p>
      <Button variant="outline" onClick={goBack}><ArrowLeft size={14} /> Retour</Button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      {/* En-tête */}
      <div className="flex items-start gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={goBack} className="shrink-0"><ArrowLeft size={16} /></Button>
        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
          {app.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold capitalize truncate">{app.full_name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-muted-foreground">
            <Badge variant="secondary">{STATUS_LABEL[app.status]}</Badge>
            <Link to={`${base}/offres/${app.job_id}`} className="hover:underline text-primary">{jobTitle}</Link>
            {app.tracking_id && <span className="font-mono text-xs">{app.tracking_id}</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => downloadFile(app.cv_path)}><FileText size={14} /> CV</Button>
          {app.cover_letter_path && <Button variant="outline" size="sm" onClick={() => downloadFile(app.cover_letter_path!)}><Download size={14} /> Lettre</Button>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card icon={<Sparkles size={14} />} title="Analyse IA" action={
            <Button size="sm" variant="outline" onClick={analyze} disabled={analyzing || app.ai_status === "processing"}>
              {analyzing || app.ai_status === "processing" ? <><Loader2 size={13} className="animate-spin" /> Analyse…</> : <><Sparkles size={13} /> {app.ai_analyzed_at ? "Réanalyser" : "Analyser"}</>}
            </Button>
          }>
            {!app.ai_analyzed_at ? (
              <p className="text-sm text-muted-foreground italic">Aucune analyse disponible. Cliquez sur « Analyser ».</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Gauge label="Adéquation au poste" value={app.ai_match_percentage} />
                  <Gauge label="Qualité du CV" value={app.ai_score} />
                </div>
                {app.ai_recommendation && (
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
                    <span className="text-[11px] uppercase text-primary font-semibold mr-2">Recommandation</span>
                    {RECO_LABEL[app.ai_recommendation] ?? app.ai_recommendation}
                  </div>
                )}
                {app.ai_summary && <p className="text-sm whitespace-pre-line">{app.ai_summary}</p>}
                {!!app.ai_skills?.length && (
                  <div className="flex flex-wrap gap-1.5">{app.ai_skills.map((s, i) => <Badge key={i} variant="secondary" className="text-[11px]">{s}</Badge>)}</div>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  {!!app.ai_strengths?.length && <List icon={<ThumbsUp size={12} className="text-emerald-600" />} title="Forces" items={app.ai_strengths} />}
                  {!!app.ai_weaknesses?.length && <List icon={<ThumbsDown size={12} className="text-rose-600" />} title="Points d'attention" items={app.ai_weaknesses} />}
                </div>
              </div>
            )}
          </Card>

          <Card icon={<MessageSquare size={14} />} title="Notes RH internes">
            <Textarea rows={5} placeholder="Vos remarques, prochaines étapes, contexte d'entretien…" value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" />
            <Button size="sm" onClick={saveNotes} disabled={saving || notes === (app.notes || "")}>
              {saving ? <><Loader2 size={13} className="animate-spin" /> Enregistrement…</> : <><Save size={13} /> Enregistrer</>}
            </Button>
          </Card>

          {app.interview_message && (
            <Card icon={<Calendar size={14} />} title="Message d'entretien envoyé">
              <p className="text-sm whitespace-pre-line p-3 rounded-md bg-muted/40 border">{app.interview_message}</p>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card icon={<Briefcase size={14} />} title="Décision">
            <Select value={app.status} onValueChange={(v) => void changeStatus(v as AppStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as AppStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            {pendingInterview && (
              <div className="space-y-2 pt-1">
                <label className="text-xs font-medium text-muted-foreground">Invitation à l'entretien (date, heure, visio ou présentiel)</label>
                <Textarea rows={4} value={interviewMsg} onChange={(e) => setInterviewMsg(e.target.value)} placeholder="Ex : mardi 20 octobre à 10 h, en visio Teams…" />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setPendingInterview(false); setInterviewMsg(""); }}>Annuler</Button>
                  <Button size="sm" disabled={!interviewMsg.trim()} onClick={() => void changeStatus("entretien", interviewMsg.trim())}><Mail size={13} /> Envoyer</Button>
                </div>
              </div>
            )}
          </Card>

          <Card icon={<User size={14} />} title="Contact">
            <Row icon={<Mail size={13} />} value={<a className="text-primary hover:underline" href={`mailto:${app.email}`}>{app.email}</a>} />
            {app.phone && <Row icon={<Phone size={13} />} value={<a className="text-primary hover:underline" href={`tel:${app.phone}`}>{app.phone}</a>} />}
            {app.linkedin_url && <Row icon={<Linkedin size={13} />} value={<a className="text-primary hover:underline" href={app.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>} />}
            {app.portfolio_url && <Row icon={<Globe size={13} />} value={<a className="text-primary hover:underline" href={app.portfolio_url} target="_blank" rel="noreferrer">Portfolio</a>} />}
          </Card>

          <div className="text-[11px] text-muted-foreground space-y-0.5 px-1">
            <div>Reçue : {format(new Date(app.created_at), "dd/MM/yyyy HH:mm")}</div>
            <div>Dernière mise à jour : {format(new Date(app.updated_at), "dd/MM/yyyy HH:mm")}</div>
            {app.ai_analyzed_at && <div>Analyse IA : {format(new Date(app.ai_analyzed_at), "dd/MM/yyyy HH:mm")}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>{title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Gauge({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="p-3 rounded-lg border bg-background">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold text-primary tabular-nums">{value == null ? "—" : `${value} %`}</div>
      <div className="h-1.5 mt-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${value ?? 0}%` }} /></div>
    </div>
  );
}

function List({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase text-muted-foreground flex items-center gap-1">{icon} {title}</div>
      <ul className="text-sm list-disc pl-5 space-y-0.5">{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
    </div>
  );
}

function Row({ icon, value }: { icon: React.ReactNode; value: React.ReactNode }) {
  return <div className="flex items-center gap-2 text-sm min-w-0"><span className="text-muted-foreground">{icon}</span><span className="truncate">{value}</span></div>;
}
