import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Mail,
  Send,
  Sparkles,
  User,
  Eye,
  Pencil,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  X,
  FileText,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const TOTAL_MAX_SIZE = 25 * 1024 * 1024; // 25 MB combined
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];
const ACCEPT_ATTR = ".pdf,image/png,image/jpeg,image/webp,image/gif";
const ATTACHMENT_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30 days

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
  return `${(b / (1024 * 1024)).toFixed(2)} Mo`;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipientEmail: string;
  recipientName?: string;
  recipientUserId?: string;
}

type Template = {
  id: string;
  label: string;
  subject: string;
  body: (name: string) => string;
};

const TEMPLATES: Template[] = [
  {
    id: "reminder",
    label: "Rappel formation",
    subject: "Rappel — formation à finaliser",
    body: (n) =>
      `Bonjour ${n || ""},\n\nNous avons remarqué qu'une formation reste à finaliser dans votre espace.\n\nMerci de bien vouloir la compléter dans les meilleurs délais.\n\nCordialement,`,
  },
  {
    id: "meeting",
    label: "Demande d'entretien",
    subject: "Proposition d'un échange",
    body: (n) =>
      `Bonjour ${n || ""},\n\nJ'aimerais convenir d'un court échange avec vous cette semaine.\n\nMerci de m'indiquer vos disponibilités.\n\nCordialement,`,
  },
  {
    id: "thanks",
    label: "Remerciements",
    subject: "Merci pour votre engagement",
    body: (n) =>
      `Bonjour ${n || ""},\n\nJe tenais à vous remercier pour votre implication récente.\n\nContinuez ainsi !\n\nCordialement,`,
  },
  {
    id: "info",
    label: "Information importante",
    subject: "Information importante",
    body: (n) =>
      `Bonjour ${n || ""},\n\nNous souhaitions vous transmettre une information importante :\n\n— \n\nN'hésitez pas à revenir vers nous pour toute question.\n\nCordialement,`,
  },
];

const SUBJECT_MAX = 200;
const MESSAGE_MAX = 8000;
const MESSAGE_MIN = 5;

export default function SendDirectEmailDialog({
  open,
  onOpenChange,
  recipientEmail,
  recipientName,
  recipientUserId,
}: Props) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [senderName, setSenderName] = useState("CloudMature");
  const [senderRole, setSenderRole] = useState<string>("");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setSubject("");
    setMessage("");
    setTab("edit");
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      if (profile?.full_name) setSenderName(profile.full_name);
      const r = (roles || []).map((x: any) => x.role);
      if (r.includes("admin")) setSenderRole("Administration");
      else if (r.includes("hr")) setSenderRole("Ressources Humaines");
      else if (r.includes("gestionnaire")) setSenderRole("Gestionnaire");
      else setSenderRole("");
    })();
  }, [open]);

  const initials = useMemo(() => {
    const n = (recipientName || recipientEmail || "?").trim();
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }, [recipientName, recipientEmail]);

  const firstName = useMemo(() => (recipientName || "").split(/\s+/)[0] || "", [recipientName]);

  const subjectError =
    subject.length > SUBJECT_MAX
      ? `Sujet trop long (${subject.length}/${SUBJECT_MAX})`
      : "";
  const messageTrimmedLen = message.trim().length;
  const messageError =
    message.length > MESSAGE_MAX
      ? `Message trop long (${message.length}/${MESSAGE_MAX})`
      : messageTrimmedLen > 0 && messageTrimmedLen < MESSAGE_MIN
      ? "Message trop court (min. 5 caractères)"
      : "";

  const canSend =
    !submitting &&
    subject.trim().length > 0 &&
    messageTrimmedLen >= MESSAGE_MIN &&
    !subjectError &&
    !messageError;

  const applyTemplate = (t: Template) => {
    setSubject(t.subject);
    setMessage(t.body(firstName));
    setTab("edit");
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSubmitting(true);
    const idempotencyKey = `direct-msg-${recipientUserId || recipientEmail}-${Date.now()}`;
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "direct-message",
        recipientEmail,
        idempotencyKey,
        templateData: {
          recipientName: recipientName || "",
          senderName,
          senderRole,
          messageSubject: subject.trim(),
          messageBody: message.trim(),
        },
      },
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Échec de l'envoi");
      return;
    }
    toast.success(`Email envoyé à ${recipientName || recipientEmail}`);
    onOpenChange(false);
  };

  const messageCountColor =
    message.length > MESSAGE_MAX
      ? "text-destructive"
      : message.length > MESSAGE_MAX * 0.9
      ? "text-amber-500"
      : "text-muted-foreground";

  const previewParagraphs = message.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="bg-gradient-primary-deep px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Mail className="h-5 w-5" /> Envoyer un email
          </DialogTitle>
          <DialogDescription className="text-white/80">
            Message direct au destinataire — il pourra répondre par retour d'email.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-5 pb-2 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Recipient card */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">
                  {recipientName || "Destinataire"}
                </span>
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <User className="h-3 w-3" /> Employé
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground font-mono truncate">
                {recipientEmail}
              </div>
            </div>
          </div>

          {/* Templates */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-medium">Modèles rapides</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="text-xs px-2.5 py-1 rounded-md border bg-background hover:bg-primary/10 hover:border-primary/40 transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs Edit / Preview */}
          <div className="flex items-center gap-1 border-b">
            <button
              type="button"
              onClick={() => setTab("edit")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors",
                tab === "edit"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Pencil className="h-3.5 w-3.5" /> Édition
            </button>
            <button
              type="button"
              onClick={() => setTab("preview")}
              disabled={!subject && !message}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors disabled:opacity-40",
                tab === "preview"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="h-3.5 w-3.5" /> Aperçu
            </button>
          </div>

          {tab === "edit" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Sujet</Label>
                  <span className="text-[10px] text-muted-foreground">
                    {subject.length} / {SUBJECT_MAX}
                  </span>
                </div>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Objet du message"
                  maxLength={SUBJECT_MAX}
                  className={cn(subjectError && "border-destructive focus-visible:ring-destructive")}
                />
                {subjectError && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {subjectError}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Message</Label>
                  <span className={cn("text-[10px]", messageCountColor)}>
                    {message.length} / {MESSAGE_MAX}
                  </span>
                </div>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={10}
                  placeholder={`Bonjour ${firstName || ""},\n\n…`}
                  maxLength={MESSAGE_MAX}
                  className={cn(
                    "resize-none font-[inherit]",
                    messageError && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    Astuce : laissez une ligne vide entre les paragraphes pour aérer le message.
                  </p>
                  {messageError ? (
                    <span className="text-[11px] text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {messageError}
                    </span>
                  ) : messageTrimmedLen >= MESSAGE_MIN ? (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Prêt
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-background overflow-hidden">
              <div className="bg-muted/40 px-4 py-2 border-b">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Sujet
                </div>
                <div className="text-sm font-semibold truncate">
                  {subject || <span className="text-muted-foreground italic">(aucun sujet)</span>}
                </div>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <p>Bonjour {recipientName || ""},</p>
                <div className="rounded-md border-l-2 border-primary bg-muted/30 p-3 space-y-2 whitespace-pre-wrap">
                  {previewParagraphs.length > 0 ? (
                    previewParagraphs.map((p, i) => <p key={i}>{p}</p>)
                  ) : (
                    <p className="text-muted-foreground italic">(message vide)</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Envoyé par {senderName}
                  {senderRole ? ` (${senderRole})` : ""} · L'équipe CloudMature
                </p>
              </div>
            </div>
          )}

          <div className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
            <span>
              Expéditeur : <span className="font-semibold not-italic">{senderName}</span>
              {senderRole ? ` · ${senderRole}` : ""}
            </span>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
