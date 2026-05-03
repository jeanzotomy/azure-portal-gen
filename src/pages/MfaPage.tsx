import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShieldCheck, Smartphone, Loader2, Phone } from "lucide-react";
import favicon from "@/assets/cloudmature-logo.png";
import { useTranslation } from "@/i18n/LanguageContext";
import { markSmsMfaVerified, markMfaVerified } from "@/hooks/use-mfa";

type MfaMethod = "totp" | "sms";

export default function MfaPage() {
  const [step, setStep] = useState<"loading" | "enroll" | "verify">("loading");
  const [mfaMethod, setMfaMethod] = useState<MfaMethod>("totp");
  const [qrCode, setQrCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState("");
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const redirectByRole = async (userId: string) => {
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roleList = (roles || []).map(r => r.role);
    if (roleList.includes("admin") || roleList.includes("agent") || roleList.includes("gestionnaire") || roleList.includes("comptable")) {
      navigate("/admin");
    } else if (roleList.includes("onboarding")) {
      navigate("/onboarding");
    } else {
      navigate("/portal");
    }
  };

  useEffect(() => { checkMfaStatus(); }, []);

  const checkMfaStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    // removed email MFA

    const { data: profile } = await supabase.from("profiles").select("phone").eq("user_id", user.id).maybeSingle();
    if (profile?.phone) setUserPhone(profile.phone);

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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        markMfaVerified(currentUser.id);
      }
      toast({ title: t("mfa.success"), description: t("mfa.successDesc") });
      if (currentUser) { await redirectByRole(currentUser.id); } else { navigate("/portal"); }
    } catch (err: any) {
      toast({ title: t("mfa.invalidCode"), description: err.message, variant: "destructive" }); setOtp("");
    } finally { setLoading(false); }
  };

  // SMS MFA
  const handleSendSmsMfa = async () => {
    if (!userPhone) {
      toast({ title: t("mfa.noPhone"), description: t("mfa.noPhoneDesc"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const normalizedPhone = userPhone.startsWith("+") ? userPhone : `+1${userPhone.replace(/\D/g, "")}`;
      const res = await supabase.functions.invoke("send-sms-otp", {
        body: { phone: normalizedPhone, purpose: "mfa", user_id: user?.id },
      });
      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || "SMS send failed");
      }
      setSmsSent(true);
      toast({ title: t("mfa.smsSent"), description: t("mfa.smsSentDesc") });
    } catch (err: any) {
      toast({ title: t("auth.error"), description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleVerifySmsMfa = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const normalizedPhone = userPhone?.startsWith("+") ? userPhone : `+1${(userPhone || "").replace(/\D/g, "")}`;
      const res = await supabase.functions.invoke("verify-sms-otp", {
        body: { phone: normalizedPhone, code: otp, purpose: "mfa" },
      });
      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || "Verification failed");
      }
      if (res.data?.success) {
        markSmsMfaVerified();
        const { data: { user: smsUser } } = await supabase.auth.getUser();
        if (smsUser) markMfaVerified(smsUser.id);
        toast({ title: t("mfa.success"), description: t("mfa.successDesc") });
        if (smsUser) {
          await redirectByRole(smsUser.id);
        } else {
          navigate(res.data.redirectTo || "/portal");
        }
      }
    } catch (err: any) {
      toast({ title: t("mfa.invalidCode"), description: err.message, variant: "destructive" }); setOtp("");
    } finally { setLoading(false); }
  };

  const switchMethod = (method: MfaMethod) => {
    setMfaMethod(method);
    setOtp("");
    setSmsSent(false);
  };

  if (step === "loading") {
    return (<div className="min-h-screen gradient-hero flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>);
  }

  const methodButtons: { key: MfaMethod; icon: React.ReactNode; label: string; available: boolean }[] = [
    { key: "totp", icon: <ShieldCheck size={14} />, label: t("mfa.totpOption"), available: true },
    { key: "sms", icon: <Phone size={14} />, label: t("mfa.smsOption"), available: !!userPhone },
  ];

  const availableMethods = methodButtons.filter(m => m.available);

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

          {/* MFA method toggle - show on verify step when multiple methods available */}
          {step === "verify" && availableMethods.length > 1 && (
            <div className="flex mb-4 rounded-lg overflow-hidden border border-border/30">
              {availableMethods.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => switchMethod(m.key)}
                  className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                    mfaMethod === m.key ? "bg-primary text-primary-foreground" : "bg-secondary/20 text-secondary-foreground/60 hover:bg-secondary/40"
                  }`}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Enrollment step (TOTP only) */}
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

          {/* TOTP verification */}
          {step === "verify" && mfaMethod === "totp" && (
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

          {/* SMS verification */}
          {step === "verify" && mfaMethod === "sms" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Phone size={20} />
                <span className="font-medium text-primary-foreground">{t("mfa.smsOption")}</span>
              </div>
              {!smsSent ? (
                <>
                  <p className="text-sm text-secondary-foreground/60">
                    {t("mfa.smsSendDesc")} ({userPhone})
                  </p>
                  <Button type="button" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading} onClick={handleSendSmsMfa}>
                    <Phone size={16} className="mr-2" />
                    {loading ? t("mfa.sendingSmsCode") : t("mfa.sendSmsCode")}
                  </Button>
                </>
              ) : (
                <form onSubmit={handleVerifySmsMfa} className="space-y-4">
                  <p className="text-sm text-secondary-foreground/60">{t("mfa.enterSmsCode")}</p>
                  <Input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="bg-secondary/30 border-border/30 text-primary-foreground text-center text-2xl tracking-[0.5em] placeholder:text-secondary-foreground/40 placeholder:tracking-[0.5em]" autoFocus required />
                  <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading || otp.length !== 6}>
                    <Phone size={16} className="mr-2" /> {loading ? t("mfa.verifying") : t("mfa.smsVerify")}
                  </Button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
