import { useState } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function ContactSection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("contact_requests").insert({
        name: form.name,
        email: form.email,
        company: form.company,
        message: form.message,
      });
      if (error) throw error;
      toast({ title: "Message envoyé!", description: "Nous vous répondrons dans les meilleurs délais." });
      setForm({ name: "", email: "", company: "", message: "" });
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
                { icon: Phone, text: "+1 873-300-5370" },
                { icon: MapPin, text: "Montréal, QC, Canada" },
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

          <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-4">
            <Input placeholder="Votre nom" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40" />
            <Input type="email" placeholder="Email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40" />
            <Input placeholder="Entreprise" value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40" />
            <Textarea placeholder="Votre message" required rows={4} value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40" />
            <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading}>
              <Send size={16} className="mr-2" /> {loading ? "Envoi..." : "Envoyer"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
