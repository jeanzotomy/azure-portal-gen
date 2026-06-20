import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, ShieldCheck, KeyRound } from "lucide-react";

interface Props {
  email: string;
}

const STRENGTH_LABELS = ["Très faible", "Faible", "Moyen", "Bon", "Excellent"];
const STRENGTH_COLORS = ["bg-destructive", "bg-destructive", "bg-warning", "bg-primary", "bg-emerald-500"];

function scorePassword(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

export default function ChangePasswordCard({ email }: Props) {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const score = scorePassword(pw);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) {
      toast({ title: "Mot de passe trop court", description: "Minimum 8 caractères.", variant: "destructive" });
      return;
    }
    if (pw !== confirm) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    if (pw === current) {
      toast({ title: "Erreur", description: "Le nouveau mot de passe doit être différent de l'actuel.", variant: "destructive" });
      return;
    }
    if (score < 2) {
      toast({ title: "Mot de passe trop faible", description: "Ajoutez majuscules, chiffres et symboles.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Reauthentication: verify current password
      const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: current });
      if (reauthError) {
        toast({ title: "Mot de passe actuel incorrect", description: "Veuillez réessayer.", variant: "destructive" });
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast({ title: "Mot de passe mis à jour", description: "Votre mot de passe a été modifié avec succès." });
      setCurrent(""); setPw(""); setConfirm("");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de mettre à jour le mot de passe.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="text-primary" size={18} />
        <h3 className="font-semibold text-card-foreground">Changer mon mot de passe</h3>
      </div>
      <p className="text-sm text-muted-foreground -mt-3">
        Pour votre sécurité, votre mot de passe actuel vous sera demandé avant la mise à jour.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <KeyRound size={14} /> Mot de passe actuel
          </label>
          <div className="relative">
            <Input
              type={showCurrent ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
              className="pr-10"
            />
            <button type="button" onClick={() => setShowCurrent(s => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1" tabIndex={-1}>
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Lock size={14} /> Nouveau mot de passe
          </label>
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="pr-10"
            />
            <button type="button" onClick={() => setShowPw(s => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1" tabIndex={-1}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {pw && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? STRENGTH_COLORS[score] : "bg-muted"}`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Force : {STRENGTH_LABELS[score]}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Min. 8 caractères, idéalement avec majuscules, chiffres et symboles.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Lock size={14} /> Confirmer le nouveau mot de passe
          </label>
          <Input
            type={showPw ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
          {confirm && pw !== confirm && (
            <p className="text-xs text-destructive">Les mots de passe ne correspondent pas.</p>
          )}
        </div>

        <Button type="submit" disabled={loading} className="gap-2">
          <ShieldCheck size={16} />
          {loading ? "Mise à jour…" : "Mettre à jour le mot de passe"}
        </Button>
      </form>
    </div>
  );
}
