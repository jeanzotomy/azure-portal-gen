import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShieldCheck, Smartphone, Loader2 } from "lucide-react";
import favicon from "@/assets/cloudmature-logo.png";
import { useTranslation } from "@/i18n/LanguageContext";

export default function MfaPage() {
  const [step, setStep] = useState<"loading" | "enroll" | "verify">("loading");
  const [qrCode, setQrCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const redirectByRole = async (userId: string) => {
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roleList = (roles || []).map(r => r.role);
    if (roleList.includes("admin") || roleList.includes("agent")) {
      navigate("/admin");
    } else {
      navigate("/portal");
    }
  };

  useEffect(() => { checkMfaStatus(); }, []);

  const checkMfaStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") { await redirectByRole(user.id); return; }
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verifiedFactors = (factors?.totp || []).filter(f => f.status === "verified");
    if (verifiedFactors.length > 0) { setFactorId(verifiedFactors[0].id); setStep("verify"); }
    else { await startEnrollment(); }
  };

  const startEnrollment = async () => {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const unverifiedFactors = (factors?.totp || []).filter(f => (f.status as string) === "unverified");
    for (const f of unverifiedFactors) { await supabase.auth.mfa.unenroll({ factorId: f.id }); }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "Portail Cloudmature", friendlyName: "Portail Cloudmature" });
    if (error) { toast({ title: t("auth.error"), description: error.message, variant: "destructive" }); return; }
    setQrCode(data.totp.qr_code); setSecret(data.totp.secret); setFactorId(data.id); setStep("enroll");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: otp });
      if (verifyError) throw verifyError;
      toast({ title: t("mfa.success"), description: t("mfa.successDesc") });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { await redirectByRole(user.id); } else { navigate("/portal"); }
    } catch (err: any) {
      toast({ title: t("mfa.invalidCode"), description: err.message, variant: "destructive" }); setOtp("");
    } finally { setLoading(false); }
  };

  if (step === "loading") {
    return (<div className="min-h-screen gradient-hero flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>);
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/auth" className="inline-flex items-center gap-2 text-sm text-secondary-foreground/60 hover:text-primary mb-8">
          <ArrowLeft size={16} /> {t("mfa.backToLogin")}
        </Link>
        <div className="glass rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <img src={favicon} alt="CloudMature" className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">{t("mfa.title")}</h1>
              <p className="text-sm text-secondary-foreground/60">{t("mfa.subtitle")}</p>
            </div>
          </div>

          {step === "enroll" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Smartphone size={20} />
                <span className="font-medium text-primary-foreground">{t("mfa.initialSetup")}</span>
              </div>
              <p className="text-sm text-secondary-foreground/60">{t("mfa.scanQr")}</p>
              <div className="flex justify-center bg-white rounded-xl p-4">
                <img src={qrCode} alt="QR Code MFA" className="w-48 h-48" />
              </div>
              {secret && (
                <div className="text-center">
                  <p className="text-xs text-secondary-foreground/40 mb-1">{t("mfa.manualCode")}</p>
                  <code className="text-xs bg-secondary/30 px-3 py-1 rounded text-primary-foreground break-all">{secret}</code>
                </div>
              )}
              <form onSubmit={handleVerify} className="space-y-4 pt-2">
                <div>
                  <label className="text-sm text-secondary-foreground/60 mb-1 block">{t("mfa.enterCode")}</label>
                  <Input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="bg-secondary/30 border-border/30 text-primary-foreground text-center text-2xl tracking-[0.5em] placeholder:text-secondary-foreground/40 placeholder:tracking-[0.5em]" required />
                </div>
                <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading || otp.length !== 6}>
                  <ShieldCheck size={16} className="mr-2" /> {loading ? t("mfa.verifying") : t("mfa.activateMfa")}
                </Button>
              </form>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <ShieldCheck size={20} />
                <span className="font-medium text-primary-foreground">{t("mfa.verificationRequired")}</span>
              </div>
              <p className="text-sm text-secondary-foreground/60">{t("mfa.verificationDesc")}</p>
              <form onSubmit={handleVerify} className="space-y-4">
                <Input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="bg-secondary/30 border-border/30 text-primary-foreground text-center text-2xl tracking-[0.5em] placeholder:text-secondary-foreground/40 placeholder:tracking-[0.5em]" autoFocus required />
                <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading || otp.length !== 6}>
                  <ShieldCheck size={16} className="mr-2" /> {loading ? t("mfa.verifying") : t("mfa.verify")}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
