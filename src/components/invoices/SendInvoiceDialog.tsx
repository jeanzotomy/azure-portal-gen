import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send, Mail, MessageCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { InvoicePDFTemplate, type InvoicePDFData } from "@/components/InvoicePDFTemplate";
import { generateInvoicePDFBlob, sanitizeName } from "@/lib/invoice-generator";
import { loadInvoicePDFData, invoiceFilePrefix } from "@/lib/invoice-pdf-data";
import { buildWhatsappUrl, sanitizeE164 } from "@/lib/social-channels";

const LINK_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30 jours

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId: string | null;
  status: string;
  onSent?: () => void;
}

const fmtMoney = (n: number, c: string) =>
  `${new Intl.NumberFormat("fr-FR").format(Math.round(Number(n) || 0))} ${c}`;

type WhatsappResponse = {
  ok?: boolean;
  error?: string;
  twilio_code?: number | string | null;
  reason?: string;
  fallback?: string;
};

const readFunctionError = async (error: unknown) => {
  const fallback = error instanceof Error ? error.message : "Échec de l'appel";
  const context = (error as { context?: unknown })?.context;
  if (context && typeof (context as { text?: unknown }).text === "function") {
    try {
      const raw = await (context as { text: () => Promise<string> }).text();
      try {
        const parsed = JSON.parse(raw) as { error?: string };
        return parsed.error || raw || fallback;
      } catch {
        return raw || fallback;
      }
    } catch {
      return fallback;
    }
  }
  return fallback;
};

export default function SendInvoiceDialog({ open, onOpenChange, invoiceId, status, onSent }: Props) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState("");
  const [data, setData] = useState<InvoicePDFData | null>(null);
  const [renderPdf, setRenderPdf] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [byEmail, setByEmail] = useState(true);
  const [byWhatsapp, setByWhatsapp] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const pdfRef = useRef<HTMLDivElement>(null);

  const docLabel = status === "proforma" ? "Facture proforma" : status === "payee" ? "Reçu" : "Facture";

  useEffect(() => {
    if (!open || !invoiceId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setData(null);
      try {
        const d = await loadInvoicePDFData(invoiceId);
        if (cancelled) return;
        setData(d);
        setEmail(d.client.email ?? "");
        setPhone(sanitizeE164(d.client.phone ?? ""));
        setByEmail(true);
        setByWhatsapp(false);
        setSubject(`${docLabel} ${d.invoice_number} — CloudMature`);
        const due = d.due_date
          ? ` Échéance : ${new Date(d.due_date).toLocaleDateString("fr-FR")}.`
          : "";
        setMessage(
          `Veuillez trouver votre ${docLabel.toLowerCase()} ${d.invoice_number} d'un montant de ${fmtMoney(d.total, d.currency)}.${due}\n\n` +
            `Le document PDF est disponible via le lien de téléchargement sécurisé ci-dessous.`,
        );
      } catch (e) {
        toast.error((e as Error).message || "Chargement impossible");
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoiceId]);

  const cleanPhone = sanitizeE164(phone);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSend =
    !!data &&
    !sending &&
    (byEmail || byWhatsapp) &&
    (!byEmail || emailOk) &&
    (!byWhatsapp || cleanPhone.length >= 6) &&
    message.trim().length > 0;

  const buildAndUpload = async (d: InvoicePDFData) => {
    setProgress("Génération du PDF…");
    setRenderPdf(true);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => setTimeout(r, 250));
    if (!pdfRef.current) throw new Error("Rendu PDF indisponible");
    const blob = await generateInvoicePDFBlob(pdfRef.current);
    setRenderPdf(false);

    const prefix = invoiceFilePrefix(status);
    const fileName = `${prefix}_${sanitizeName(d.invoice_number)}_${sanitizeName(d.client.client_name)}.pdf`;
    const path = `${invoiceId}/${Date.now()}_${fileName}`;

    setProgress("Dépôt du document sécurisé…");
    const { error: upErr } = await supabase.storage
      .from("invoice-documents")
      .upload(path, blob, { contentType: "application/pdf", upsert: false });
    if (upErr) throw new Error(`Dépôt échoué : ${upErr.message}`);

    const { data: signed, error: signErr } = await supabase.storage
      .from("invoice-documents")
      .createSignedUrl(path, LINK_EXPIRY_SECONDS);
    if (signErr || !signed?.signedUrl) throw new Error("Lien sécurisé impossible à générer");

    return {
      url: signed.signedUrl,
      expiresAt: new Date(Date.now() + LINK_EXPIRY_SECONDS * 1000).toISOString(),
    };
  };

  const handleSend = async () => {
    if (!canSend || !data || !invoiceId) return;
    setSending(true);
    try {
      const { url, expiresAt } = await buildAndUpload(data);
      const channels: string[] = [];

      if (byEmail) {
        setProgress("Envoi de l'email…");
        const { error } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "invoice-delivery",
            recipientEmail: email.trim(),
            idempotencyKey: `invoice-${invoiceId}-${Date.now()}`,
            templateData: {
              clientName: data.client.contact_person || data.client.client_name,
              documentLabel: docLabel,
              invoiceNumber: data.invoice_number,
              invoiceDate: data.invoice_date,
              dueDate: data.due_date,
              amountLabel: fmtMoney(data.total, data.currency),
              messageBody: message.trim(),
              downloadUrl: url,
              linkExpiresAt: expiresAt,
              subjectOverride: subject.trim(),
            },
          },
        });
        if (error) throw new Error(error.message || "Échec de l'envoi email");
        channels.push("email");
      }

      if (byWhatsapp) {
        setProgress("Envoi du WhatsApp…");
        const waBody =
          `*${docLabel} ${data.invoice_number} — CloudMature*\n\n` +
          `${message.trim()}\n\n` +
          `Télécharger le PDF :\n${url}`;
        const { data: waRes, error: waErr } = await supabase.functions.invoke("send-whatsapp-message", {
          body: {
            to_e164: cleanPhone,
            body: waBody,
            // Envoi automatique via le template WhatsApp approuvé (hors fenêtre 24 h).
            template: "invoice",
            content_variables: {
              "1": data.client.contact_person || data.client.client_name,
              "2": docLabel.toLowerCase(),
              "3": data.invoice_number,
              "4": fmtMoney(data.total, data.currency),
              "5": url,
            },
          },
        });
        if (waErr) {
          throw new Error(await readFunctionError(waErr));
        }
        const result = (waRes || {}) as WhatsappResponse;
        if (result.ok === false && result.fallback === "manual_whatsapp_link") {
          const manualUrl = buildWhatsappUrl(cleanPhone, waBody);
          if (manualUrl) window.open(manualUrl, "_blank", "noopener,noreferrer");
          toast.warning(
            result.error || "Envoi automatique impossible. J'ai ouvert WhatsApp pour un envoi manuel.",
            { duration: 10000 },
          );
          channels.push("whatsapp_manual");
        } else if (result.error) {
          throw new Error(result.error);
        } else {
          channels.push("whatsapp");
        }
      }

      await supabase
        .from("service_invoices")
        .update({ sent_at: new Date().toISOString(), sent_channels: channels })
        .eq("id", invoiceId);

      toast.success(
        channels.includes("whatsapp_manual") && channels.includes("email")
          ? "Email envoyé ; WhatsApp ouvert pour envoi manuel"
          : channels.includes("whatsapp_manual")
            ? "WhatsApp ouvert pour envoi manuel"
            : channels.length === 2
          ? "Facture envoyée par email et WhatsApp"
          : channels[0] === "email"
            ? `Facture envoyée à ${email.trim()}`
            : `Facture envoyée à +${cleanPhone}`,
      );
      onOpenChange(false);
      onSent?.();
    } catch (e) {
      toast.error((e as Error).message || "Échec de l'envoi");
    } finally {
      setSending(false);
      setProgress("");
      setRenderPdf(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !sending && onOpenChange(o)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Envoyer {docLabel.toLowerCase()} au client
            </DialogTitle>
            <DialogDescription>
              {data
                ? <>Document <b>{data.invoice_number}</b> · {data.client.client_name} · {fmtMoney(data.total, data.currency)}</>
                : "Chargement du document…"}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-primary" size={26} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Canaux d'envoi</Label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={byEmail} onCheckedChange={(v) => setByEmail(!!v)} />
                    <Mail size={14} className="text-primary" /> Email
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={byWhatsapp} onCheckedChange={(v) => setByWhatsapp(!!v)} />
                    <MessageCircle size={14} className="text-[#25D366]" /> WhatsApp
                  </label>
                </div>
              </div>

              {byEmail && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Email du client</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@exemple.com"
                  />
                  {!emailOk && email.length > 0 && (
                    <p className="text-xs text-destructive">Adresse email invalide.</p>
                  )}
                </div>
              )}

              {byWhatsapp && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Numéro WhatsApp (E.164 sans +)</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="224620000000"
                  />
                </div>
              )}

              {byEmail && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Objet de l'email</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Message</Label>
                <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText size={12} /> Le PDF est joint via un lien de téléchargement sécurisé (30 jours).
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Annuler
            </Button>
            <Button onClick={() => void handleSend()} disabled={!canSend}>
              {sending ? <Loader2 className="animate-spin mr-1" size={14} /> : <Send size={14} className="mr-1" />}
              {sending ? progress || "Envoi…" : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {renderPdf && data && (
        <div style={{ position: "fixed", left: "-10000px", top: 0 }} aria-hidden>
          <InvoicePDFTemplate ref={pdfRef} data={data} />
        </div>
      )}
    </>
  );
}
