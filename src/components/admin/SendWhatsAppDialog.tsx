import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Send, MessageCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { sanitizeE164 } from "@/lib/social-channels";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPhone?: string | null;
  defaultMessage?: string;
  recipientName?: string | null;
  ticketId?: string | null;
  onSent?: () => void;
};

export function SendWhatsAppDialog({
  open, onOpenChange,
  defaultPhone, defaultMessage, recipientName, ticketId, onSent,
}: Props) {
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setPhone(sanitizeE164(defaultPhone || ""));
      setBody(defaultMessage || "");
    }
  }, [open, defaultPhone, defaultMessage]);

  const clean = sanitizeE164(phone);
  const canSend = clean.length >= 6 && body.trim().length > 0 && !sending;

  const handleSend = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-message", {
        body: { to_e164: clean, body: body.trim(), ticket_id: ticketId ?? null },
      });
      if (error) {
        const msg = (error as any)?.context?.error || error.message || "Échec de l'envoi";
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      toast.success(`WhatsApp envoyé à +${clean}`);
      onOpenChange(false);
      onSent?.();
    } catch (e: any) {
      toast.error(e?.message || "Échec de l'envoi WhatsApp");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !sending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
            Envoyer un WhatsApp
          </DialogTitle>
          <DialogDescription>
            {recipientName
              ? <>Message direct à <b>{recipientName}</b> via Twilio WhatsApp Business.</>
              : "Message direct via Twilio WhatsApp Business."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Numéro (E.164 sans +)</Label>
            <Input
              inputMode="numeric"
              placeholder="224620000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={sending}
            />
            {!clean && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Indispensable : code pays + numéro, chiffres uniquement.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Message</Label>
            <Textarea
              rows={5}
              maxLength={1500}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={sending}
              placeholder="Bonjour, nous donnons suite à votre demande de support…"
            />
            <p className="text-[10px] text-muted-foreground text-right">{body.length} / 1500</p>
          </div>

          {ticketId && (
            <p className="text-[11px] text-muted-foreground">
              L'envoi sera consigné comme réponse interne sur ce ticket.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={!canSend} className="bg-[#25D366] hover:bg-[#1ebe5a] text-white">
            {sending
              ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Envoi…</>
              : <><Send className="h-4 w-4 mr-1.5" /> Envoyer</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SendWhatsAppDialog;
