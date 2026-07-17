import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const quoteSchema = z.object({
  full_name: z.string().trim().min(2, "Nom trop court").max(100),
  company: z.string().trim().max(150).optional().or(z.literal("")),
  email: z.string().trim().email("Email invalide").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  quantity: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), "Nombre entier attendu"),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

type QuoteRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  serviceId?: string | null;
  userId?: string | null;
  defaultEmail?: string | null;
};

export function QuoteRequestDialog({
  open,
  onOpenChange,
  serviceName,
  serviceId,
  userId,
  defaultEmail,
}: QuoteRequestDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const raw = {
      full_name: String(fd.get("full_name") ?? ""),
      company: String(fd.get("company") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      country: String(fd.get("country") ?? ""),
      quantity: String(fd.get("quantity") ?? ""),
      message: String(fd.get("message") ?? ""),
    };
    const parsed = quoteSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("quote_requests").insert({
      service_name: serviceName,
      service_id: serviceId ?? null,
      user_id: userId ?? null,
      full_name: parsed.data.full_name,
      company: parsed.data.company || null,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      country: parsed.data.country || null,
      quantity: parsed.data.quantity ? Number(parsed.data.quantity) : null,
      message: parsed.data.message || null,
      status: "new",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erreur lors de l'envoi : " + error.message);
      return;
    }
    setDone(true);
    toast.success("Demande envoyée ! Notre équipe vous contactera sous 24-48h.");
  };

  const handleClose = (o: boolean) => {
    if (!o) {
      setDone(false);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b -mx-6 px-6 pb-4 mb-2 bg-gradient-primary-deep text-primary-foreground -mt-6 pt-6 rounded-t-lg">
          <DialogTitle className="text-primary-foreground">
            Demander un devis
          </DialogTitle>
          <DialogDescription className="text-primary-foreground/85">
            {serviceName}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <h3 className="text-lg font-semibold">Demande envoyée</h3>
            <p className="text-sm text-muted-foreground">
              Notre équipe commerciale vous répondra sous 24 à 48 heures.
            </p>
            <Button onClick={() => handleClose(false)} className="mt-2">
              Fermer
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="q_full_name">Nom complet *</Label>
                <Input id="q_full_name" name="full_name" required maxLength={100} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="q_company">Entreprise</Label>
                <Input id="q_company" name="company" maxLength={150} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="q_email">Email *</Label>
                <Input
                  id="q_email"
                  name="email"
                  type="email"
                  required
                  maxLength={255}
                  defaultValue={defaultEmail ?? ""}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="q_phone">Téléphone</Label>
                <Input id="q_phone" name="phone" maxLength={30} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="q_country">Pays</Label>
                <Input id="q_country" name="country" maxLength={80} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="q_quantity">Quantité (postes / licences)</Label>
                <Input
                  id="q_quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  placeholder="ex: 10"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="q_message">Message / besoins spécifiques</Label>
              <Textarea
                id="q_message"
                name="message"
                rows={4}
                maxLength={2000}
                placeholder="Précisez votre contexte, calendrier, volumétrie..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer la demande
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
