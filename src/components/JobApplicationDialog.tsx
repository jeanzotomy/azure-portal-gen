import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobId: string;
  jobTitle: string;
}

const MAX_FILE = 5 * 1024 * 1024; // 5 MB

const sanitize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "-")
    .trim();

export function JobApplicationDialog({ open, onOpenChange, jobId, jobTitle }: Props) {
  const { user } = useAuthSession();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.user_metadata?.full_name || "",
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

  const uploadToSharePoint = async (file: File, folderPath: string, fileName: string): Promise<string | null> => {
    if (file.size > MAX_FILE) {
      toast({ title: "Fichier trop volumineux", description: "Maximum 5 Mo.", variant: "destructive" });
      return null;
    }
    // Récupérer config SharePoint
    const { data: cfg, error: cfgErr } = await supabase
      .from("sharepoint_config")
      .select("site_id, drive_id")
      .limit(1)
      .maybeSingle();
    if (cfgErr || !cfg) {
      toast({ title: "Configuration SharePoint manquante", description: "Contactez l'administrateur.", variant: "destructive" });
      return null;
    }
    const filePath = `${folderPath}/${fileName}`;
    const { data: { session } } = await supabase.auth.getSession();
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/sharepoint-proxy?action=upload-file&siteId=${encodeURIComponent(cfg.site_id)}&driveId=${encodeURIComponent(cfg.drive_id || "")}&filePath=${encodeURIComponent(filePath)}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });
    if (!res.ok) {
      const err = await res.text();
      toast({ title: "Erreur SharePoint", description: err.substring(0, 200), variant: "destructive" });
      return null;
    }
    return filePath;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !cvFile) {
      toast({ title: "Champs requis", description: "Nom, prénom, email et CV sont obligatoires.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`;
    const folderName = `Candidat-${sanitize(form.last_name)}-${sanitize(form.first_name)}-${jobId.substring(0, 8)}`;
    const folderPath = `Candidatures/${folderName}`;
    const ts = Date.now();
    const cvExt = cvFile.name.split(".").pop();
    const cvPath = await uploadToSharePoint(cvFile, folderPath, `CV-${ts}.${cvExt}`);
    if (!cvPath) { setSubmitting(false); return; }
    let letterPath: string | null = null;
    if (letterFile) {
      const lExt = letterFile.name.split(".").pop();
      letterPath = await uploadToSharePoint(letterFile, folderPath, `Lettre-${ts}.${lExt}`);
    }
    const { error } = await supabase.from("job_applications").insert({
      job_id: jobId,
      user_id: user.id,
      full_name: fullName,
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      portfolio_url: form.portfolio_url.trim() || null,
      years_experience: form.years_experience ? parseInt(form.years_experience) : null,
      salary_expectation: form.salary_expectation.trim() || null,
      cv_path: cvPath,
      cover_letter_path: letterPath,
      notes: form.cover_letter_text.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Candidature envoyée", description: "Documents stockés dans SharePoint. Nous reviendrons vers vous rapidement." });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] text-primary-foreground -m-6 mb-2 p-6 rounded-t-lg">
          <DialogTitle className="text-primary-foreground">Postuler : {jobTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Nom *</label>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Prénom *</label>
              <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Téléphone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Années d'expérience</label>
              <Input type="number" min="0" value={form.years_experience} onChange={(e) => setForm({ ...form, years_experience: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Prétention salariale</label>
              <Input placeholder="Ex: 15 000 000 GNF / mois" value={form.salary_expectation} onChange={(e) => setForm({ ...form, salary_expectation: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">LinkedIn</label>
              <Input placeholder="https://linkedin.com/in/..." value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Portfolio / Site web</label>
              <Input placeholder="https://..." value={form.portfolio_url} onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">CV (PDF, max 5 Mo) *</label>
            <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
            {cvFile && <p className="text-xs text-muted-foreground mt-1"><Upload size={12} className="inline" /> {cvFile.name}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Lettre de motivation (PDF, optionnel)</label>
            <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setLetterFile(e.target.files?.[0] || null)} />
            {letterFile && <p className="text-xs text-muted-foreground mt-1"><Upload size={12} className="inline" /> {letterFile.name}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Message complémentaire</label>
            <Textarea rows={4} value={form.cover_letter_text} onChange={(e) => setForm({ ...form, cover_letter_text: e.target.value })} placeholder="Présentez-vous brièvement..." />
          </div>
          <p className="text-xs text-muted-foreground">📁 Vos documents seront stockés dans SharePoint : <code>Candidatures/Candidat-Nom-Prenom-...</code></p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Envoi..." : "Envoyer ma candidature"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
