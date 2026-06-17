import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast as sonnerToast } from "sonner";
import {
  Mail, Phone, Linkedin, Globe, Briefcase, Calendar, Hash, FileText, Download,
  Sparkles, Loader2, ThumbsUp, ThumbsDown, TrendingUp, MessageSquare, Save, User,
} from "lucide-react";
import { format } from "date-fns";

type AppStatus = "nouvelle" | "en_revue" | "entretien" | "acceptee" | "refusee";

const STATUS_LABEL: Record<AppStatus, string> = {
  nouvelle: "Nouvelle", en_revue: "En revue", entretien: "Entretien", acceptee: "Acceptée", refusee: "Refusée",
};
const STATUS_COLOR: Record<AppStatus, string> = {
  nouvelle: "bg-blue-500/10 text-blue-600",
  en_revue: "bg-amber-500/10 text-amber-600",
  entretien: "bg-purple-500/10 text-purple-600",
  acceptee: "bg-emerald-500/10 text-emerald-600",
  refusee: "bg-rose-500/10 text-rose-600",
};

interface Props {
  applicationId: string | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  onChangeStatus: (id: string, status: AppStatus) => void;
}

interface AppDetail {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  years_experience: number | null;
  salary_expectation: string | null;
  cv_path: string;
  cover_letter_path: string | null;
  status: AppStatus;
  notes: string | null;
  tracking_id: string | null;
  created_at: string;
  updated_at: string;
  interview_message: string | null;
  job_id: string;
  ai_score: number | null;
  ai_match_percentage: number | null;
  ai_summary: string | null;
  ai_skills: string[] | null;
  ai_strengths: string[] | null;
  ai_weaknesses: string[] | null;
  ai_recommendation: string | null;
  ai_analyzed_at: string | null;
  ai_status: string | null;
}

export default function CandidateDetailDrawer({ applicationId, onOpenChange, onUpdated, onChangeStatus }: Props) {
  const [app, setApp] = useState<AppDetail | null>(null);
  const [jobTitle, setJobTitle] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!applicationId) { setApp(null); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("job_applications").select("*").eq("id", applicationId).maybeSingle();
      if (data) {
        setApp(data as any);
        setNotes((data as any).notes || "");
        const { data: job } = await supabase.from("job_postings").select("title").eq("id", (data as any).job_id).maybeSingle();
        setJobTitle(job?.title || "Offre supprimée");
      }
      setLoading(false);
    })();
  }, [applicationId]);

  const saveNotes = async () => {
    if (!app) return;
    setSaving(true);
    const { error } = await supabase.from("job_applications").update({ notes }).eq("id", app.id);
    setSaving(false);
    if (error) { sonnerToast.error("Erreur", { description: error.message }); return; }
    sonnerToast.success("Notes enregistrées");
    onUpdated();
  };

  const analyze = async () => {
    if (!app) return;
    setAnalyzing(true);
    const { error, data } = await supabase.functions.invoke("analyze-cv", { body: { application_id: app.id } });
    setAnalyzing(false);
    if (error || (data as any)?.error) {
      sonnerToast.error("Analyse échouée", { description: error?.message || (data as any)?.error });
      return;
    }
    sonnerToast.success("Analyse terminée");
    const { data: fresh } = await supabase.from("job_applications").select("*").eq("id", app.id).maybeSingle();
    if (fresh) setApp(fresh as any);
    onUpdated();
  };

  const downloadFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("cv-applications").createSignedUrl(path, 60);
    if (error || !data) { sonnerToast.error("Téléchargement impossible"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const open = !!applicationId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        {loading || !app ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <SheetHeader className="px-6 py-5 border-b bg-gradient-to-br from-primary/5 to-background">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-lg">
                  {app.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-xl truncate">{app.full_name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge className={STATUS_COLOR[app.status]}>{STATUS_LABEL[app.status]}</Badge>
                    {app.tracking_id && (
                      <span className="text-xs font-mono text-muted-foreground">{app.tracking_id}</span>
                    )}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Identité */}
              <Section icon={<User size={14} />} title="Identité & contact">
                <Row icon={<Mail size={13} />} label="Email" value={<a className="text-primary hover:underline truncate" href={`mailto:${app.email}`}>{app.email}</a>} />
                {app.phone && <Row icon={<Phone size={13} />} label="Téléphone" value={app.phone} />}
                {app.linkedin_url && <Row icon={<Linkedin size={13} />} label="LinkedIn" value={<a className="text-primary hover:underline truncate" href={app.linkedin_url} target="_blank" rel="noreferrer">{app.linkedin_url}</a>} />}
                {app.portfolio_url && <Row icon={<Globe size={13} />} label="Portfolio" value={<a className="text-primary hover:underline truncate" href={app.portfolio_url} target="_blank" rel="noreferrer">{app.portfolio_url}</a>} />}
              </Section>

              {/* Candidature */}
              <Section icon={<Briefcase size={14} />} title="Candidature">
                <Row icon={<Briefcase size={13} />} label="Poste" value={jobTitle} />
                {app.years_experience != null && <Row icon={<TrendingUp size={13} />} label="Expérience" value={`${app.years_experience} an${app.years_experience > 1 ? "s" : ""}`} />}
                {app.salary_expectation && <Row icon={<Hash size={13} />} label="Salaire souhaité" value={app.salary_expectation} />}
                <Row icon={<Calendar size={13} />} label="Reçue le" value={format(new Date(app.created_at), "dd/MM/yyyy 'à' HH:mm")} />
                <div className="pt-2">
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Statut</label>
                  <Select value={app.status} onValueChange={(v) => { onChangeStatus(app.id, v as AppStatus); onOpenChange(false); }}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as AppStatus[]).map(s => (
                        <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Section>

              {/* Fichiers */}
              <Section icon={<FileText size={14} />} title="Documents">
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => downloadFile(app.cv_path)}>
                    <FileText size={14} className="mr-1.5" /> Télécharger le CV
                  </Button>
                  {app.cover_letter_path && (
                    <Button size="sm" variant="outline" onClick={() => downloadFile(app.cover_letter_path!)}>
                      <Download size={14} className="mr-1.5" /> Lettre de motivation
                    </Button>
                  )}
                </div>
              </Section>

              {/* IA */}
              <Section
                icon={<Sparkles size={14} />}
                title="Analyse IA"
                action={
                  <Button size="sm" variant="outline" onClick={analyze} disabled={analyzing || app.ai_status === "processing"}>
                    {analyzing || app.ai_status === "processing"
                      ? <><Loader2 size={13} className="mr-1 animate-spin" /> Analyse…</>
                      : <><Sparkles size={13} className="mr-1" /> {app.ai_analyzed_at ? "Réanalyser" : "Analyser"}</>}
                  </Button>
                }
              >
                {!app.ai_analyzed_at && app.ai_status !== "processing" && (
                  <p className="text-xs text-muted-foreground italic">Aucune analyse disponible. Cliquez sur « Analyser ».</p>
                )}
                {app.ai_analyzed_at && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {app.ai_score != null && (
                        <div className="p-3 rounded-lg border bg-card/60">
                          <div className="text-[10px] uppercase text-muted-foreground">Score global</div>
                          <div className="text-2xl font-bold text-primary mt-1">{app.ai_score}/100</div>
                        </div>
                      )}
                      {app.ai_match_percentage != null && (
                        <div className="p-3 rounded-lg border bg-card/60">
                          <div className="text-[10px] uppercase text-muted-foreground">Match poste</div>
                          <div className="text-2xl font-bold text-primary mt-1">{app.ai_match_percentage}%</div>
                        </div>
                      )}
                    </div>
                    {app.ai_summary && <p className="text-sm text-foreground/90 whitespace-pre-line">{app.ai_summary}</p>}
                    {app.ai_skills && app.ai_skills.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground mb-1.5">Compétences</div>
                        <div className="flex flex-wrap gap-1.5">
                          {app.ai_skills.map((s, i) => <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>)}
                        </div>
                      </div>
                    )}
                    {app.ai_strengths && app.ai_strengths.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><ThumbsUp size={11} className="text-emerald-600" /> Forces</div>
                        <ul className="text-sm text-foreground/90 list-disc pl-5 space-y-0.5">
                          {app.ai_strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {app.ai_weaknesses && app.ai_weaknesses.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><ThumbsDown size={11} className="text-rose-600" /> Points d'attention</div>
                        <ul className="text-sm text-foreground/90 list-disc pl-5 space-y-0.5">
                          {app.ai_weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {app.ai_recommendation && (
                      <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <div className="text-[10px] uppercase text-primary font-semibold mb-1">Recommandation</div>
                        <p className="text-sm">{app.ai_recommendation}</p>
                      </div>
                    )}
                  </div>
                )}
              </Section>

              {/* Notes */}
              <Section icon={<MessageSquare size={14} />} title="Notes RH internes">
                <Textarea
                  rows={5}
                  placeholder="Vos remarques, prochaines étapes, contexte d'entretien..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none"
                />
                <Button size="sm" onClick={saveNotes} disabled={saving || notes === (app.notes || "")} className="mt-2">
                  {saving ? <><Loader2 size={13} className="mr-1.5 animate-spin" /> Enregistrement…</> : <><Save size={13} className="mr-1.5" /> Enregistrer</>}
                </Button>
              </Section>

              {app.interview_message && (
                <Section icon={<Calendar size={14} />} title="Message d'entretien envoyé">
                  <p className="text-sm whitespace-pre-line p-3 rounded-md bg-muted/40 border">{app.interview_message}</p>
                </Section>
              )}

              <Separator />
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <div>Reçue : {format(new Date(app.created_at), "dd/MM/yyyy HH:mm")}</div>
                <div>Dernière maj : {format(new Date(app.updated_at), "dd/MM/yyyy HH:mm")}</div>
                {app.ai_analyzed_at && <div>Analyse IA : {format(new Date(app.ai_analyzed_at), "dd/MM/yyyy HH:mm")}</div>}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
          {title}
        </h4>
        {action}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <span className="text-muted-foreground min-w-[110px]">{label}</span>
      <span className="text-foreground font-medium min-w-0 truncate flex-1">{value}</span>
    </div>
  );
}
