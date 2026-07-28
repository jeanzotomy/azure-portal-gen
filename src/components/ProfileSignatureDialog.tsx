import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useToast } from "@/hooks/use-toast";
import { SignaturePad } from "@/components/SignaturePad";
import { PenLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveSignatureUrl } from "@/lib/signatures";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * Dialog "Ma signature".
 * Sauvegarde dans le bucket privé `signatures/{user_id}/signature.png`
 * et stocke le chemin storage dans `profiles.signature_url`.
 * L'affichage utilise un signed URL temporaire.
 */
export function ProfileSignatureDialog({ open, onOpenChange }: Props) {
  const { user } = useAuthSession();
  const { toast } = useToast();
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [savedTitle, setSavedTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    void (async () => {
      const { data } = await supabase.from("profiles").select("signature_url, signature_title").eq("user_id", user.id).maybeSingle();
      setHasSignature(!!data?.signature_url);
      const t = ((data as any)?.signature_title as string | null) ?? "";
      setTitle(t);
      setSavedTitle(t);
      const signed = await resolveSignatureUrl(data?.signature_url);
      setCurrentUrl(signed);
    })();
  }, [open, user]);

  const handleSaveTitle = async () => {
    if (!user) return;
    setSavingTitle(true);
    try {
      const { error } = await (supabase as any).rpc("update_own_signature_title", { _title: title });
      if (error) throw error;
      setSavedTitle(title.trim());
      setTitle(title.trim());
      toast({ title: "Fonction enregistrée", description: "Elle apparaîtra sous votre signature." });
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Échec", variant: "destructive" });
    } finally {
      setSavingTitle(false);
    }
  };


  const handleSave = async (blob: Blob) => {
    if (!user) return;
    setSaving(true);
    try {
      const path = `${user.id}/signature.png`;
      const { error: upErr } = await supabase.storage.from("signatures").upload(path, blob, {
        contentType: "image/png",
        upsert: true,
        cacheControl: "0",
      });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase.from("profiles").update({ signature_url: path }).eq("user_id", user.id);
      if (updErr) throw updErr;
      const signed = await resolveSignatureUrl(path);
      setCurrentUrl(signed);
      setHasSignature(true);
      toast({ title: "Signature enregistrée", description: "Elle sera apposée sur vos prochaines factures."
  });
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Échec de l'enregistrement", variant: "destructive"
  });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.storage.from("signatures").remove([`${user.id}/signature.png`]);
      await supabase.from("profiles").update({ signature_url: null }).eq("user_id", user.id);
      setCurrentUrl(null);
      setHasSignature(false);
      toast({ title: "Signature supprimée"
  });
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive"
  });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <PenLine size={20} className="shrink-0" /> Ma signature
          </DialogTitle>
          <DialogDescription className="text-white/85">
            Dessinez votre signature ci-dessous. Elle apparaîtra automatiquement sur les factures que vous émettez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">

          <SignaturePad initialImage={currentUrl} onSave={handleSave} saving={saving} />

          <div className="border-t pt-3 space-y-2">
            <Label htmlFor="signature-title" className="text-xs font-medium">
              Fonction / titre affiché sous la signature
            </Label>
            <div className="flex gap-2">
              <Input
                id="signature-title"
                value={title}
                maxLength={120}
                placeholder="Ex : Directeur Général"
                onChange={(e) => setTitle(e.target.value)}
              />
              <Button type="button" onClick={handleSaveTitle} disabled={savingTitle || title.trim() === savedTitle.trim()}>
                Confirmer
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Laissez vide pour utiliser automatiquement le libellé de votre rôle. Vous pourrez aussi l'ajuster document par document.
            </p>
          </div>



          {hasSignature && (
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-xs text-muted-foreground">Signature actuelle enregistrée</span>
              <Button type="button"
  variant="ghost" size="sm" onClick={handleDelete} disabled={saving} className="text-destructive">
                <Trash2 size={14} className="mr-1" /> Supprimer
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
