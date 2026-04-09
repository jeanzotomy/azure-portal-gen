import { useState } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import contactImage from "@/assets/business-woman-talking-phone-side-view-2.jpg";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function ContactSection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Le nom est requis.";
    if (!form.email.trim()) errs.email = "L'email est requis.";
    else if (!validateEmail(form.email.trim())) errs.email = "Veuillez entrer un email valide.";
    if (!form.company.trim()) errs.company = "L'entreprise est requise.";
    if (!form.message.trim()) errs.message = "Le message est requis.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("contact_requests").insert({
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        message: form.message.trim(),
      });
      if (error) throw error;
      toast({ title: "Message envoyé!", description: "Nous vous répondrons dans les meilleurs délais." });
      setForm({ name: "", email: "", company: "", message: "" });
      setErrors({});
    } catch {
      toast({ title: "Erreur", description: "Veuillez réessayer.", variant: "destructive" });
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
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">Contact</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-3 text-primary-foreground mb-6">
                Parlons de votre <span className="gradient-text">projet Cloud</span>
              </h2>
              <p className="text-secondary-foreground/70 mb-8">
                Contactez-nous pour une consultation gratuite et découvrez comment Cloud Mature peut transformer votre infrastructure.
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
                alt="Consultante Cloud Mature au téléphone"
                className="relative w-full h-56 object-cover object-top rounded-2xl ring-1 ring-white/10"
              />
              <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-background/80 backdrop-blur-md text-xs font-medium tracking-wide border border-border/40 shadow-sm">
                <span className="text-foreground">Consultation TI</span>
                <span className="text-foreground/40">·</span>
                <span className="text-foreground">Cloud</span>
                <span className="text-foreground/40">·</span>
                <span className="text-foreground">DevOps</span>
                <span className="text-foreground/40">·</span>
                <span className="text-foreground font-semibold">IA</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-4">
            <div>
              <Input placeholder="Votre nom *" required value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors(prev => ({ ...prev, name: "" })); }}
                className={`bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40 ${errors.name ? "border-destructive" : ""}`} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <Input type="email" placeholder="Email *" required value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors(prev => ({ ...prev, email: "" })); }}
                className={`bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40 ${errors.email ? "border-destructive" : ""}`} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <Input placeholder="Entreprise *" required value={form.company}
                onChange={(e) => { setForm({ ...form, company: e.target.value }); setErrors(prev => ({ ...prev, company: "" })); }}
                className={`bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40 ${errors.company ? "border-destructive" : ""}`} />
              {errors.company && <p className="text-xs text-destructive mt-1">{errors.company}</p>}
            </div>
            <div>
              <Textarea placeholder="Votre message *" required rows={4} value={form.message}
                onChange={(e) => { setForm({ ...form, message: e.target.value }); setErrors(prev => ({ ...prev, message: "" })); }}
                className={`bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40 ${errors.message ? "border-destructive" : ""}`} />
              {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading}>
              <Send size={16} className="mr-2" /> {loading ? "Envoi..." : "Envoyer"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
