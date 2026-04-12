import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Cloud, ArrowLeft, Mail, ShieldBan, Phone, Smartphone } from "lucide-react";
import favicon from "@/assets/cloudmature-logo.png";
import { useTranslation } from "@/i18n/LanguageContext";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsOtp, setSmsOtp] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const isBlocked = searchParams.get("blocked") === "1";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (isBlocked) {
      toast({ title: t("auth.blocked"), description: t("auth.blockedDesc"), variant: "destructive" });
    }
  }, [isBlocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: t("auth.emailSent"), description: t("auth.emailSentDesc") });
        setMode("login");
      } else if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: profile } = await supabase.from("profiles").select("blocked").eq("user_id", data.user.id).maybeSingle();
        if (profile?.blocked) {
          await supabase.auth.signOut();
          toast({ title: t("auth.blocked"), description: t("auth.blockedDesc"), variant: "destructive" });
          setLoading(false);
          return;
        }
        navigate("/mfa");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: t("auth.signupSuccess"), description: t("auth.signupSuccessDesc") });
      }
    } catch (err: any) {
      toast({ title: t("auth.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/mfa",
    });
    if (result.error) {
      toast({ title: t("auth.error"), description: String(result.error), variant: "destructive" });
      return;
    }
    if (result.redirected) return;
    navigate("/mfa");
  };

  const handleSendSmsOtp = async () => {
    if (!phoneNumber || !/^\+[1-9]\d{6,14}$/.test(phoneNumber)) {
      toast({ title: t("auth.error"), description: t("auth.phonePlaceholder"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("send-sms-otp", {
        body: { phone: phoneNumber, purpose: "login" },
      });
      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || "SMS send failed");
      }
      setSmsSent(true);
      toast({ title: t("auth.smsSent"), description: t("auth.smsSentDesc") });
    } catch (err: any) {
      toast({ title: t("auth.smsError"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySmsOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("verify-sms-otp", {
        body: { phone: phoneNumber, code: smsOtp, purpose: "login" },
      });
      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || "Verification failed");
      }
      if (res.data?.success) {
        // Sign in with the temporary password provided by the server
        if (res.data.email && res.data.tempPassword) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: res.data.email,
            password: res.data.tempPassword,
          });
          if (signInErr) throw signInErr;
        }
        toast({ title: t("auth.smsVerified"), description: t("auth.smsVerifiedDesc") });
        navigate(res.data.redirectTo || "/mfa");
      }
    } catch (err: any) {
      toast({ title: t("auth.smsInvalidCode"), description: err.message, variant: "destructive" });
      setSmsOtp("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-secondary-foreground/60 hover:text-primary mb-8">
          <ArrowLeft size={16} /> {t("auth.backToSite")}
        </Link>

        <div className="glass rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <img src={favicon} alt="CloudMature" className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">{t("auth.portalTitle")}</h1>
              <p className="text-sm text-secondary-foreground/60">Cloud Mature</p>
            </div>
          </div>

          {isBlocked && (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive">
              <ShieldBan size={20} className="flex-shrink-0" />
              <div>
                <p className="font-semibold">{t("auth.suspended")}</p>
                <p className="text-xs mt-0.5 text-destructive/80">{t("auth.suspendedDesc")}</p>
              </div>
            </div>
          )}

          {mode === "login" && (
            <>
              {/* Auth method toggle */}
              <div className="flex mb-4 rounded-lg overflow-hidden border border-border/30">
                <button
                  type="button"
                  onClick={() => { setAuthMethod("email"); setSmsSent(false); setSmsOtp(""); }}
                  className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    authMethod === "email" ? "bg-primary text-primary-foreground" : "bg-secondary/20 text-secondary-foreground/60 hover:bg-secondary/40"
                  }`}
                >
                  <Mail size={14} /> {t("auth.emailTab")}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod("phone")}
                  className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    authMethod === "phone" ? "bg-primary text-primary-foreground" : "bg-secondary/20 text-secondary-foreground/60 hover:bg-secondary/40"
                  }`}
                >
                  <Smartphone size={14} /> {t("auth.phoneTab")}
                </button>
              </div>
            </>
          )}

          {/* Google login - only for email mode and not forgot */}
          {mode !== "forgot" && authMethod === "email" && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full mb-4 bg-white/10 border-border/30 text-primary-foreground hover:bg-white/20"
                onClick={handleGoogleLogin}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t("auth.continueGoogle")}
              </Button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/30" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-transparent px-2 text-secondary-foreground/40">{t("auth.or")}</span>
                </div>
              </div>
            </>
          )}

          {/* Phone login mode */}
          {mode === "login" && authMethod === "phone" && (
            <div className="space-y-4">
              {!smsSent ? (
                <>
                  <Input
                    type="tel"
                    placeholder={t("auth.phonePlaceholder")}
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40"
                  />
                  <p className="text-xs text-secondary-foreground/40">{t("auth.twilioTrial")}</p>
                  <Button
                    type="button"
                    className="w-full gradient-primary text-primary-foreground border-0"
                    disabled={loading || !phoneNumber}
                    onClick={handleSendSmsOtp}
                  >
                    <Phone size={16} className="mr-2" />
                    {loading ? t("auth.sendingSmsCode") : t("auth.sendSmsCode")}
                  </Button>
                </>
              ) : (
                <form onSubmit={handleVerifySmsOtp} className="space-y-4">
                  <p className="text-sm text-secondary-foreground/60">{t("auth.enterSmsCode")}</p>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={smsOtp}
                    onChange={(e) => setSmsOtp(e.target.value.replace(/\D/g, ""))}
                    className="bg-secondary/30 border-border/30 text-primary-foreground text-center text-2xl tracking-[0.5em] placeholder:text-secondary-foreground/40 placeholder:tracking-[0.5em]"
                    autoFocus
                    required
                  />
                  <Button
                    type="submit"
                    className="w-full gradient-primary text-primary-foreground border-0"
                    disabled={loading || smsOtp.length !== 6}
                  >
                    <Phone size={16} className="mr-2" />
                    {loading ? t("auth.verifyingSmsCode") : t("auth.verifySmsCode")}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setSmsSent(false); setSmsOtp(""); }}
                    className="block w-full text-center text-sm text-primary hover:underline"
                  >
                    {t("auth.backToLogin")}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Email login / signup / forgot form */}
          {(mode !== "login" || authMethod === "email") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <Input placeholder={t("auth.fullName")} required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40" />
              )}
              <Input type="email" placeholder={t("auth.email")} required value={email} onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40" />
              {mode !== "forgot" && (
                <Input type="password" placeholder={t("auth.password")} required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40" />
              )}
              <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading}>
                {mode === "forgot" ? (
                  <><Mail size={16} className="mr-2" /> {loading ? t("auth.sendingLink") : t("auth.sendLink")}</>
                ) : (
                  <><Cloud size={16} className="mr-2" /> {loading ? t("auth.loading") : mode === "login" ? t("auth.login") : t("auth.signup")}</>
                )}
              </Button>
            </form>
          )}

          {mode === "login" && authMethod === "email" && (
            <button onClick={() => setMode("forgot")} className="block w-full text-center text-sm text-primary hover:underline mt-4">
              {t("auth.forgotPassword")}
            </button>
          )}

          <p className="text-center text-sm text-secondary-foreground/60 mt-4">
            {mode === "forgot" ? (
              <button onClick={() => setMode("login")} className="text-primary hover:underline">{t("auth.backToLogin")}</button>
            ) : mode === "login" ? (
              <>{t("auth.noAccount")} <button onClick={() => { setMode("signup"); setAuthMethod("email"); }} className="text-primary hover:underline">{t("auth.signup")}</button></>
            ) : (
              <>{t("auth.hasAccount")} <button onClick={() => setMode("login")} className="text-primary hover:underline">{t("auth.login")}</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
