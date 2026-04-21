import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useToast } from "@/hooks/use-toast";
import { SignaturePad } from "@/components/SignaturePad";
import { PenLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * Dialog "Ma signature" pour admin/comptable.
 * Sauvegarde dans bucket `signatures/{user_id}/signature.png`
 * et met à jour `profiles.signature_url`.
 */
export function ProfileSignatureDialog({ open, onOpenChange }: Props) {
  const { user } = useAuthSession();
  const { toast } = useToast();
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    void (async () => {
      const { data } = await supabase.from("profiles").select("signature_url").eq("user_id", user.id).maybeSingle();
      setCurrentUrl(data?.signature_url ?? null);
    })();
  }, [open, user]);

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
      const { data: pub } = supabase.storage.from("signatures").getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: updErr } = await supabase.from("profiles").update({ signature_url: url }).eq("user_id", user.id);
      if (updErr) throw updErr;
      setCurrentUrl(url);
      toast({ title: "Signature enregistrée", description: "Elle sera apposée sur vos prochaines factures." });
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Échec de l'enregistrement", variant: "destructive" });
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
      toast({ title: "Signature supprimée" });
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto max-w-xl p-0 gap-0 [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100">
        <DialogHeader className="bg-gradient-to-r from-primary to-[#007aa3] text-primary-foreground px-4 sm:px-6 py-4 rounded-t-lg pr-12">
          <DialogTitle className="text-primary-foreground flex items-center gap-2 text-base sm:text-lg">
            <PenLine size={20} className="shrink-0" /> Ma signature
          </DialogTitle>
          <DialogDescription className="text-primary-foreground/80 text-xs sm:text-sm">
            Dessinez votre signature ci-dessous. Elle apparaîtra automatiquement sur les factures que vous émettez.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 sm:p-6 space-y-3">

        <SignaturePad initialImage={currentUrl} onSave={handleSave} saving={saving} />

        {currentUrl && (
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-xs text-muted-foreground">Signature actuelle enregistrée</span>
            <Button type="button" variant="ghost" size="sm" onClick={handleDelete} disabled={saving} className="text-destructive">
              <Trash2 size={14} className="mr-1" /> Supprimer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
