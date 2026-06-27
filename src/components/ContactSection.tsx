import { useState } from "react";
import { Mail, Phone, MapPin, Send, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import contactImage from "@/assets/business-woman-talking-phone-side-view-2.jpg";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n/LanguageContext";
import { SocialChannels } from "@/components/SocialChannels";


// Limits - also enforced by audit on contact_requests table
const LIMITS = { name: 100, email: 255, company: 150, message: 2000 };

export function ContactSection() {
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  // Honeypot - bots tend to fill every visible-or-not input
  const [hp, setHp] = useState("");
  const [mountedAt] = useState(() => Date.now());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Email verification state
  const [otpStep, setOtpStep] = useState<"idle" | "sent" | "verified">("idle");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isVerified = otpStep === "verified" && verifiedEmail === form.email.trim().toLowerCase();

  const txt = {
    verifyBtn: locale === "en" ? "Verify email" : "Vérifier l'email",
    verifyAgain: locale === "en" ? "Re-verify" : "Revérifier",
    sending: locale === "en" ? "Sending…" : "Envoi…",
    codeSent: locale === "en"
      ? "A 6-digit code was sent to your email. Enter it below to confirm."
      : "Un code à 6 chiffres a été envoyé à votre email. Saisissez-le ci-dessous pour confirmer.",
    codeLabel: locale === "en" ? "Verification code" : "Code de vérification",
    confirmBtn: locale === "en" ? "Confirm code" : "Confirmer le code",
    confirming: locale === "en" ? "Confirming…" : "Confirmation…",
    resend: locale === "en" ? "Resend code" : "Renvoyer le code",
    verified: locale === "en" ? "Email verified" : "Email vérifié",
    needVerify: locale === "en"
      ? "Please verify your email address before sending the message."
      : "Veuillez d'abord vérifier votre adresse email.",
    cooldown: locale === "en"
      ? "Please wait a moment before requesting a new code."
      : "Merci de patienter quelques instants avant de demander un nouveau code.",
    invalidCode: locale === "en" ? "Invalid code." : "Code invalide.",
    expired: locale === "en" ? "Code expired. Request a new one." : "Code expiré. Demandez-en un nouveau.",
    sendFailed: locale === "en" ? "Could not send the code." : "Impossible d'envoyer le code.",
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    const name = form.name.trim();
    const email = form.email.trim();
    const company = form.company.trim();
    const message = form.message.trim();
    if (!name) errs.name = t("contact.validationName");
    else if (name.length > LIMITS.name) errs.name = `Max ${LIMITS.name} caractères`;
    if (!email) errs.email = t("contact.validationEmail");
    else if (!validateEmail(email)) errs.email = t("contact.validationEmailInvalid");
    else if (email.length > LIMITS.email) errs.email = `Max ${LIMITS.email} caractères`;
    if (!company) errs.company = t("contact.validationCompany");
    else if (company.length > LIMITS.company) errs.company = `Max ${LIMITS.company} caractères`;
    if (!message) errs.message = t("contact.validationMessage");
    else if (message.length > LIMITS.message) errs.message = `Max ${LIMITS.message} caractères`;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleEmailChange = (value: string) => {
    setForm({ ...form, email: value });
    setErrors((prev) => ({ ...prev, email: "" }));
    // Reset verification if user edits the email
    if (otpStep !== "idle" && value.trim().toLowerCase() !== verifiedEmail) {
      setOtpStep("idle");
      setVerifiedEmail(null);
      setVerificationToken(null);
      setOtpCode("");
      setOtpError(null);
    }
  };

  const sendOtp = async () => {
    const email = form.email.trim();
    if (!validateEmail(email)) {
      setErrors((p) => ({ ...p, email: t("contact.validationEmailInvalid") }));
      return;
    }
    setOtpLoading(true); setOtpError(null);
    try {
      const { data, error } = await supabase.functions.invoke("contact-email-otp", {
        body: { action: "send", email },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error === "cooldown") { setOtpError(txt.cooldown); return; }
      if ((data as any)?.error) { setOtpError(txt.sendFailed); return; }
      setOtpStep("sent");
      setOtpCode("");
    } catch {
      setOtpError(txt.sendFailed);
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    const email = form.email.trim().toLowerCase();
    if (!/^\d{6}$/.test(otpCode)) { setOtpError(txt.invalidCode); return; }
    setOtpLoading(true); setOtpError(null);
    try {
      const { data, error } = await supabase.functions.invoke("contact-email-otp", {
        body: { action: "verify", email, code: otpCode },
      });
      if (error) throw new Error(error.message);
      const err = (data as any)?.error;
      if (err === "expired" || err === "no_active_code") { setOtpError(txt.expired); return; }
      if (err) { setOtpError(txt.invalidCode); return; }
      setVerificationToken((data as any).verificationToken);
      setVerifiedEmail(email);
      setOtpStep("verified");
    } catch {
      setOtpError(txt.invalidCode);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Anti-spam: honeypot filled OR submitted in under 2s = silently drop
    if (hp.trim() || Date.now() - mountedAt < 2000) {
      toast({ title: t("contact.successTitle"), description: t("contact.successDesc") });
      return;
    }
    if (!validateForm()) return;
    if (!isVerified || !verificationToken) {
      toast({ title: t("contact.errorTitle"), description: txt.needVerify, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("contact-email-otp", {
        body: {
          action: "submit",
          email: form.email.trim().toLowerCase(),
          verificationToken,
          name: form.name.trim().slice(0, LIMITS.name),
          company: form.company.trim().slice(0, LIMITS.company),
          message: form.message.trim().slice(0, LIMITS.message),
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: t("contact.successTitle"), description: t("contact.successDesc") });
      setForm({ name: "", email: "", company: "", message: "" });
      setErrors({});
      setOtpStep("idle"); setVerifiedEmail(null); setVerificationToken(null); setOtpCode("");
    } catch {
      toast({ title: t("contact.errorTitle"), description: t("contact.errorDesc"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-24 gradient-hero">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">{t("contact.badge")}</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-3 text-primary-foreground mb-6">
                {t("contact.title")} <span className="gradient-text">{t("contact.titleHighlight")}</span>
              </h2>
              <p className="text-secondary-foreground/70 mb-8">
                {t("contact.subtitle")}
              </p>
              <div className="space-y-4">
                {[
                  { icon: Mail, text: "info@cloudmature.com" },
                  { icon: Phone, text: "+224 626 441 150" },
                  { icon: MapPin, text: "Kipé Centre Émetteur, C/Ratoma, Conakry, Guinée" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3 text-secondary-foreground/80">
                    <div className="p-2 rounded-lg gradient-primary">
                      <item.icon size={18} className="text-primary-foreground" />
                    </div>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative group overflow-hidden rounded-2xl">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 blur-lg opacity-60" />
              <img
                src={contactImage}
                alt="Cloud Mature"
                className="relative w-full h-56 object-cover object-top rounded-2xl ring-1 ring-white/10"
              />
              <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-background/80 backdrop-blur-md text-xs font-medium tracking-wide border border-border/40 shadow-sm">
                <span className="text-foreground">{t("hero.badge.consulting")}</span>
                <span aria-hidden="true" className="text-foreground/70">·</span>
                <span className="text-foreground">{t("hero.badge.cloud")}</span>
                <span aria-hidden="true" className="text-foreground/70">·</span>
                <span className="text-foreground">{t("hero.badge.devops")}</span>
                <span aria-hidden="true" className="text-foreground/70">·</span>
                <span className="text-foreground font-semibold">{t("hero.badge.ai")}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-4">
            {/* Honeypot - hidden from real users, visible to bots */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
              <label htmlFor="website">Site web</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
            </div>
            <div>
              <Input placeholder={t("contact.namePlaceholder")} required maxLength={LIMITS.name} value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors(prev => ({ ...prev, name: "" })); }}
                className={`bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/70 ${errors.name ? "border-destructive" : ""}`} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>

            {/* Email + verification */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email" placeholder={t("contact.emailPlaceholder")} required maxLength={LIMITS.email}
                  value={form.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`flex-1 bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/70 ${errors.email ? "border-destructive" : ""} ${isVerified ? "border-emerald-500/60" : ""}`}
                />
                {isVerified ? (
                  <div className="inline-flex items-center justify-center gap-1.5 px-3 rounded-md bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30 whitespace-nowrap">
                    <CheckCircle2 size={14} /> {txt.verified}
                  </div>
                ) : (
                  <Button
                    type="button" variant="outline" onClick={sendOtp} disabled={otpLoading || !form.email.trim()}
                    className="bg-primary/10 hover:bg-primary/20 border-primary/40 text-primary-foreground whitespace-nowrap"
                  >
                    {otpLoading && otpStep === "idle"
                      ? <><Loader2 size={14} className="animate-spin mr-1.5" />{txt.sending}</>
                      : <><ShieldCheck size={14} className="mr-1.5" />{otpStep === "sent" ? txt.resend : txt.verifyBtn}</>}
                  </Button>
                )}
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}

              {otpStep === "sent" && !isVerified && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                  <p className="text-xs text-secondary-foreground/80">{txt.codeSent}</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                      placeholder="123456" value={otpCode}
                      onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(null); }}
                      className="flex-1 bg-secondary/30 border-border/30 text-primary-foreground tracking-[0.4em] font-mono text-center"
                    />
                    <Button
                      type="button" onClick={verifyOtp} disabled={otpLoading || otpCode.length !== 6}
                      className="gradient-primary text-primary-foreground border-0 whitespace-nowrap"
                    >
                      {otpLoading
                        ? <><Loader2 size={14} className="animate-spin mr-1.5" />{txt.confirming}</>
                        : txt.confirmBtn}
                    </Button>
                  </div>
                  {otpError && <p className="text-xs text-destructive">{otpError}</p>}
                </div>
              )}
              {otpStep === "idle" && otpError && <p className="text-xs text-destructive">{otpError}</p>}
            </div>

            <div>
              <Input placeholder={t("contact.companyPlaceholder")} required maxLength={LIMITS.company} value={form.company}
                onChange={(e) => { setForm({ ...form, company: e.target.value }); setErrors(prev => ({ ...prev, company: "" })); }}
                className={`bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/70 ${errors.company ? "border-destructive" : ""}`} />
              {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}
            </div>
            <div>
              <Textarea placeholder={t("contact.messagePlaceholder")} required rows={4} maxLength={LIMITS.message} value={form.message}
                onChange={(e) => { setForm({ ...form, message: e.target.value }); setErrors(prev => ({ ...prev, message: "" })); }}
                className={`bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/70 ${errors.message ? "border-destructive" : ""}`} />
              {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
              <p className="text-[10px] text-secondary-foreground/50 mt-1 text-right">{form.message.length} / {LIMITS.message}</p>
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading || !isVerified}>
              <Send size={16} className="mr-2" /> {loading ? t("contact.sending") : t("contact.send")}
            </Button>
            {!isVerified && (
              <p className="text-[11px] text-secondary-foreground/70 text-center">{txt.needVerify}</p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
