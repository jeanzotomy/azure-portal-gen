import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, User, Mail, Briefcase, FileText, CheckCircle2, X, Loader2, Cloud, Lock, Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobId: string;
  jobTitle: string;
}

const MAX_FILE = 5 * 1024 * 1024;
const ACCEPTED = [".pdf", ".doc", ".docx"];

const sanitize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "-")
    .trim() || "anon";

const schema = z.object({
  first_name: z.string().trim().min(2, "Min. 2 caractères").max(50),
  last_name: z.string().trim().min(2, "Min. 2 caractères").max(50),
  email: z.string().trim().email("Email invalide").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  linkedin_url: z.string().trim().url("URL invalide").max(255).optional().or(z.literal("")),
  portfolio_url: z.string().trim().url("URL invalide").max(255).optional().or(z.literal("")),
  years_experience: z.string().refine((v) => v === "" || (parseInt(v) >= 0 && parseInt(v) <= 60), "0–60").optional(),
  salary_expectation: z.string().trim().max(100).optional(),
  cover_letter_text: z.string().trim().max(2000, "Max. 2000 caractères").optional(),
});

const SectionTitle = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 pt-1">
    <div className="p-1.5 rounded-md bg-primary/10 text-primary"><Icon size={14} /></div>
    <h3 className="text-sm font-semibold">{title}</h3>
    <div className="flex-1 h-px bg-border" />
  </div>
);

const FileDrop = ({ file, onChange, onClear, label, required }: {
  file: File | null;
  onChange: (f: File | null) => void;
  onClear: () => void;
  label: string;
  required?: boolean;
}) => (
  <div>
    <label className="text-sm font-medium flex items-center gap-1">
      {label} {required && <span className="text-destructive">*</span>}
      <span className="text-xs text-muted-foreground font-normal ml-auto">PDF/DOC · max 5 Mo</span>
    </label>
    {file ? (
      <div className="mt-1 flex items-center gap-2 p-2.5 rounded-md border border-primary/30 bg-primary/5">
        <CheckCircle2 size={16} className="text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} Ko</p>
        </div>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onClear}>
          <X size={14} />
        </Button>
      </div>
    ) : (
      <label className="mt-1 flex flex-col items-center justify-center gap-1 p-4 rounded-md border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors">
        <Upload size={18} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Cliquez pour sélectionner un fichier</span>
        <input
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
      </label>
    )}
  </div>
);

export function JobApplicationDialog({ open, onOpenChange, jobId, jobTitle }: Props) {
  const { user } = useAuthSession();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [lockedFields, setLockedFields] = useState({ first_name: false, last_name: false, phone: false });
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: user?.email || "",
    phone: "",
    linkedin_url: "",
    portfolio_url: "",
    years_experience: "",
    salary_expectation: "",
    cover_letter_text: "",
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [letterFile, setLetterFile] = useState<File | null>(null);

  // Préremplir depuis le profil utilisateur (uniquement si connecté)
  useEffect(() => {
    if (!user || !open || profileLoaded) return;
    supabase
      .from("profiles")
      .select("first_name, last_name, full_name, phone")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setProfileLoaded(true); return; }
        const d = data as any;
        let first = (d.first_name || "").trim();
        let last = (d.last_name || "").trim();
        if ((!first || !last) && d.full_name) {
          const parts = String(d.full_name).trim().split(/\s+/);
          if (!first) first = parts.shift() || "";
          if (!last) last = parts.join(" ");
        }
        const phone = (d.phone || "").trim();
        setForm((f) => ({
          ...f,
          first_name: first || f.first_name,
          last_name: last || f.last_name,
          email: f.email || user.email || "",
          phone: phone || f.phone,
        }));
        setLockedFields({
          first_name: !!first,
          last_name: !!last,
          phone: !!phone,
        });
        setProfileLoaded(true);
      });
  }, [user, open, profileLoaded]);

  const update = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  // Upload to public Supabase Storage bucket — works for anonymous users
  const uploadFile = async (file: File, fileName: string): Promise<string | null> => {
    if (file.size > MAX_FILE) {
      toast({ title: "Fichier trop volumineux", description: `${file.name} dépasse 5 Mo.`, variant: "destructive" });
      return null;
    }
    // Folder: 'public/<jobId>/<lastname>-<firstname>-<timestamp>/<fileName>' for anonymous users
    // Or 'public/<jobId>/<userId-or-anon>/<fileName>'
    const folder = user?.id || "anon";
    const path = `public/${jobId}/${folder}/${Date.now()}-${fileName}`;
    const { data, error } = await supabase.storage
      .from("cv-applications")
      .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (error) {
      toast({ title: "Erreur d'envoi", description: error.message, variant: "destructive" });
      return null;
    }
    return data.path;
  };

  const handleSubmit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((e) => { if (e.path[0]) errs[e.path[0] as string] = e.message; });
      setErrors(errs);
      toast({ title: "Formulaire incomplet", description: "Corrigez les champs en rouge.", variant: "destructive" });
      return;
    }
    if (!cvFile) {
      toast({ title: "CV requis", description: "Veuillez joindre votre CV.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    // Prevent duplicate applications to the same job
    {
      let dupQuery = supabase
        .from("job_applications")
        .select("id, tracking_id", { count: "exact", head: false })
        .eq("job_id", jobId)
        .limit(1);
      dupQuery = user?.id
        ? dupQuery.eq("user_id", user.id)
        : dupQuery.ilike("email", form.email.trim());
      const { data: existing } = await dupQuery;
      if (existing && existing.length > 0) {
        setSubmitting(false);
        toast({
          title: "Candidature déjà envoyée",
          description: existing[0].tracking_id
            ? `Vous avez déjà postulé à cette offre (suivi : ${existing[0].tracking_id}).`
            : "Vous avez déjà postulé à cette offre.",
          variant: "destructive",
        });
        return;
      }
    }

    const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`;
    const baseName = `${sanitize(form.last_name)}-${sanitize(form.first_name)}`;
    const cvExt = cvFile.name.split(".").pop() || "pdf";
    const cvPath = await uploadFile(cvFile, `CV-${baseName}.${cvExt}`);
    if (!cvPath) { setSubmitting(false); return; }
    let letterPath: string | null = null;
    if (letterFile) {
      const lExt = letterFile.name.split(".").pop() || "pdf";
      letterPath = await uploadFile(letterFile, `Lettre-${baseName}.${lExt}`);
    }

    // Push files to SharePoint (best-effort, non-blocking for the application save)
    let sharepointFolderUrl: string | null = null;
    try {
      const fd = new FormData();
      fd.append("jobId", jobId);
      fd.append("firstName", form.first_name.trim());
      fd.append("lastName", form.last_name.trim());
      fd.append("cv", cvFile);
      if (letterFile) fd.append("letter", letterFile);
      const { data: spData, error: spError } = await supabase.functions.invoke("upload-application-files", { body: fd });
      if (spError) {
        console.warn("SharePoint upload failed:", spError);
      } else if (spData?.folder?.webUrl) {
        sharepointFolderUrl = spData.folder.webUrl;
      }
    } catch (e) {
      console.warn("SharePoint upload exception:", e);
    }

    const { data: inserted, error } = await supabase.from("job_applications").insert({
      job_id: jobId,
      user_id: user?.id ?? null,
      full_name: fullName,
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      portfolio_url: form.portfolio_url.trim() || null,
      years_experience: form.years_experience ? parseInt(form.years_experience) : null,
      salary_expectation: form.salary_expectation.trim() || null,
      cv_path: cvPath,
      cover_letter_path: letterPath,
      notes: [
        form.cover_letter_text?.trim() || null,
        sharepointFolderUrl ? `SharePoint: ${sharepointFolderUrl}` : null,
      ].filter(Boolean).join("\n\n") || null,
    }).select("tracking_id").maybeSingle();
    setSubmitting(false);

    if (error) {
      const isDup = (error as any)?.code === "23505" || /duplicate|unique/i.test(error.message);
      toast({
        title: isDup ? "Candidature déjà envoyée" : "Erreur",
        description: isDup
          ? "Vous avez déjà postulé à cette offre."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    const trackId = inserted?.tracking_id;
    toast({
      title: "✓ Candidature envoyée",
      description: trackId
        ? `Numéro de suivi : ${trackId}. Un email de confirmation vous a été envoyé.`
        : "Nous vous recontacterons rapidement.",
    });
    // Reset form for potential next application
    setForm({
      first_name: "", last_name: "", email: user?.email || "", phone: "",
      linkedin_url: "", portfolio_url: "", years_experience: "",
      salary_expectation: "", cover_letter_text: "",
    });
    setCvFile(null);
    setLetterFile(null);
    setProfileLoaded(false);
    onOpenChange(false);
  };

  const fieldClass = (k: string) => errors[k] ? "border-destructive focus-visible:ring-destructive" : "";
  const ErrMsg = ({ k }: { k: string }) => errors[k] ? <p className="text-xs text-destructive mt-1">{errors[k]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden [&>button]:bg-white/15 [&>button]:hover:bg-white/25 [&>button]:text-primary-foreground [&>button]:opacity-100 [&>button]:rounded-full [&>button]:p-2 [&>button]:top-4 [&>button]:right-4 [&>button>svg]:h-5 [&>button>svg]:w-5">
        <DialogHeader className="relative bg-gradient-to-br from-primary via-primary to-[#005f80] text-primary-foreground px-7 py-7 pr-16 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-8 w-52 h-52 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-5">
            <div className="shrink-0 h-14 w-14 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
              <Briefcase size={26} className="text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-primary-foreground text-2xl font-bold leading-tight">
                Postuler à cette offre
              </DialogTitle>
              <p className="text-primary-foreground/90 text-base font-normal mt-1 break-words">{jobTitle}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge className="bg-white/15 hover:bg-white/20 text-primary-foreground border border-white/20 backdrop-blur-sm gap-1.5 font-normal px-2.5 py-1">
                  <CheckCircle2 size={12} /> Sans inscription
                </Badge>
                <Badge className="bg-white/15 hover:bg-white/20 text-primary-foreground border border-white/20 backdrop-blur-sm gap-1.5 font-normal px-2.5 py-1">
                  <Cloud size={12} /> Données sécurisées
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto px-6 py-4">
          <SectionTitle icon={User} title="Identité" />
          {(lockedFields.first_name || lockedFields.last_name || lockedFields.phone) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-md px-3 py-2">
              <Lock size={12} className="shrink-0 text-primary" />
              <span>Ces informations proviennent de votre profil. Pour les modifier, mettez à jour votre profil dans l'espace client.</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                Prénom <span className="text-destructive">*</span>
                {lockedFields.first_name && <Lock size={11} className="text-muted-foreground" />}
              </label>
              <Input
                className={`${fieldClass("first_name")} ${lockedFields.first_name ? "bg-muted cursor-not-allowed" : ""}`}
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                readOnly={lockedFields.first_name}
              />
              <ErrMsg k="first_name" />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                Nom <span className="text-destructive">*</span>
                {lockedFields.last_name && <Lock size={11} className="text-muted-foreground" />}
              </label>
              <Input
                className={`${fieldClass("last_name")} ${lockedFields.last_name ? "bg-muted cursor-not-allowed" : ""}`}
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                readOnly={lockedFields.last_name}
              />
              <ErrMsg k="last_name" />
            </div>
          </div>

          <SectionTitle icon={Mail} title="Contact" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Email <span className="text-destructive">*</span></label>
              <Input type="email" className={fieldClass("email")} value={form.email} onChange={(e) => update("email", e.target.value)} />
              <ErrMsg k="email" />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                Téléphone
                {lockedFields.phone && <Lock size={11} className="text-muted-foreground" />}
              </label>
              <Input
                placeholder="+224 ..."
                className={lockedFields.phone ? "bg-muted cursor-not-allowed" : ""}
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                readOnly={lockedFields.phone}
              />
            </div>
          </div>

          <SectionTitle icon={Briefcase} title="Profil professionnel" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Années d'expérience</label>
              <Input type="number" min="0" max="60" className={fieldClass("years_experience")} value={form.years_experience} onChange={(e) => update("years_experience", e.target.value)} />
              <ErrMsg k="years_experience" />
            </div>
            <div>
              <label className="text-sm font-medium">Prétention salariale</label>
              <Input placeholder="Ex: 1M GNF/mois" value={form.salary_expectation} onChange={(e) => update("salary_expectation", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">LinkedIn</label>
              <Input placeholder="https://linkedin.com/in/..." className={fieldClass("linkedin_url")} value={form.linkedin_url} onChange={(e) => update("linkedin_url", e.target.value)} />
              <ErrMsg k="linkedin_url" />
            </div>
            <div>
              <label className="text-sm font-medium">Portfolio</label>
              <Input placeholder="https://..." className={fieldClass("portfolio_url")} value={form.portfolio_url} onChange={(e) => update("portfolio_url", e.target.value)} />
              <ErrMsg k="portfolio_url" />
            </div>
          </div>

          <SectionTitle icon={FileText} title="Documents" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FileDrop file={cvFile} onChange={setCvFile} onClear={() => setCvFile(null)} label="CV" required />
            <FileDrop file={letterFile} onChange={setLetterFile} onClear={() => setLetterFile(null)} label="Lettre de motivation" />
          </div>

          <div>
            <label className="text-sm font-medium flex justify-between">
              <span>Message complémentaire</span>
              <span className="text-xs text-muted-foreground font-normal">{form.cover_letter_text.length}/2000</span>
            </label>
            <Textarea
              rows={4}
              maxLength={2000}
              className={fieldClass("cover_letter_text")}
              value={form.cover_letter_text}
              onChange={(e) => update("cover_letter_text", e.target.value)}
              placeholder="Présentez-vous brièvement, vos motivations…"
            />
            <ErrMsg k="cover_letter_text" />
          </div>

        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="min-w-[180px]">
            {submitting ? (<><Loader2 size={14} className="mr-2 animate-spin" /> Envoi en cours…</>) : "Envoyer ma candidature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
