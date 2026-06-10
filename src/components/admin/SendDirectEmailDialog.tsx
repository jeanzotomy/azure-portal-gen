import { useEffect, useState } from "react";
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
import { Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipientEmail: string;
  recipientName?: string;
  recipientUserId?: string;
}

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

  useEffect(() => {
    if (!open) return;
    setSubject("");
    setMessage("");
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

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Sujet obligatoire");
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      toast.error("Message trop court");
      return;
    }
    if (subject.length > 200) {
      toast.error("Sujet trop long (max 200 caractères)");
      return;
    }
    if (message.length > 8000) {
      toast.error("Message trop long (max 8000 caractères)");
      return;
    }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="bg-gradient-primary-deep px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Mail className="h-5 w-5" /> Envoyer un email
          </DialogTitle>
          <DialogDescription className="text-white/80">
            Le message sera envoyé directement à l'email du destinataire.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Destinataire :</span>{" "}
            {recipientName ? `${recipientName} — ` : ""}
            <span className="font-mono">{recipientEmail}</span>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Sujet</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet du message"
              maxLength={200}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Bonjour, …"
              maxLength={8000}
            />
            <div className="text-[10px] text-muted-foreground text-right">
              {message.length} / 8000
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground italic">
            Envoyé par <span className="font-semibold">{senderName}</span>
            {senderRole ? ` · ${senderRole}` : ""}. Le destinataire peut répondre à cet email.
          </div>
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
