import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Lock } from "lucide-react";
import favicon from "@/assets/cloudmature-logo.png";
import { useTranslation } from "@/i18n/LanguageContext";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setReady(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: t("auth.error"), description: t("resetPassword.mismatch"), variant: "destructive" }); return;
    }
    if (password.length < 6) {
      toast({ title: t("auth.error"), description: t("resetPassword.tooShort"), variant: "destructive" }); return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("resetPassword.success"), description: t("resetPassword.successDesc") });
      navigate("/portal");
    }
    setLoading(false);
  };

  if (!ready) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <img src={favicon} alt="CloudMature" className="h-12 w-12 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-primary-foreground mb-2">{t("resetPassword.invalidLink")}</h1>
          <p className="text-secondary-foreground/60 mb-6">{t("resetPassword.invalidLinkDesc")}</p>
          <Link to="/auth" className="text-primary hover:underline">{t("resetPassword.backToLogin")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/auth" className="inline-flex items-center gap-2 text-sm text-secondary-foreground/60 hover:text-primary mb-8">
          <ArrowLeft size={16} /> {t("resetPassword.backToLogin")}
        </Link>
        <div className="glass rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <img src={favicon} alt="CloudMature" className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">{t("resetPassword.title")}</h1>
              <p className="text-sm text-secondary-foreground/60">{t("resetPassword.subtitle")}</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="password" placeholder={t("resetPassword.newPassword")} required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40" />
            <Input type="password" placeholder={t("resetPassword.confirmPassword")} required value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40" />
            <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading}>
              <Lock size={16} className="mr-2" /> {loading ? t("resetPassword.updating") : t("resetPassword.update")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
