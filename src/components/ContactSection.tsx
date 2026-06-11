import { useState } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import contactImage from "@/assets/business-woman-talking-phone-side-view-2.jpg";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n/LanguageContext";

// Limits — also enforced by audit on contact_requests table
const LIMITS = { name: 100, email: 255, company: 150, message: 2000 };

export function ContactSection() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  // Honeypot — bots tend to fill every visible-or-not input
  const [hp, setHp] = useState("");
  const [mountedAt] = useState(() => Date.now());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validate = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Anti-spam: honeypot filled OR submitted in under 2s = silently drop
    if (hp.trim() || Date.now() - mountedAt < 2000) {
      toast({ title: t("contact.successTitle"), description: t("contact.successDesc") });
      return;
    }
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("contact_requests").insert({
        name: form.name.trim().slice(0, LIMITS.name),
        email: form.email.trim().slice(0, LIMITS.email),
        company: form.company.trim().slice(0, LIMITS.company),
        message: form.message.trim().slice(0, LIMITS.message),
      });
      if (error) throw error;
      toast({ title: t("contact.successTitle"), description: t("contact.successDesc") });
      setForm({ name: "", email: "", company: "", message: "" });
      setErrors({});
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
            {/* Honeypot — hidden from real users, visible to bots */}
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
            <div>
              <Input type="email" placeholder={t("contact.emailPlaceholder")} required maxLength={LIMITS.email} value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors(prev => ({ ...prev, email: "" })); }}
                className={`bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/70 ${errors.email ? "border-destructive" : ""}`} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
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
            <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading}>
              <Send size={16} className="mr-2" /> {loading ? t("contact.sending") : t("contact.send")}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
