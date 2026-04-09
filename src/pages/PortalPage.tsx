import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import logo from "@/assets/logo.png";
import {
  LayoutDashboard, FolderOpen, LifeBuoy, User, LogOut, Send, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";

type Tab = "dashboard" | "projects" | "tickets" | "profile";

export default function PortalPage() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("dashboard");
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) navigate("/auth");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) return <div className="min-h-screen gradient-hero flex items-center justify-center text-primary-foreground">Chargement...</div>;
  if (!user) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navItems: { id: Tab; icon: typeof LayoutDashboard; label: string }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    { id: "projects", icon: FolderOpen, label: "Projets" },
    { id: "tickets", icon: LifeBuoy, label: "Support" },
    { id: "profile", icon: User, label: "Profil" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 gradient-hero border-r border-border/10 flex flex-col">
        <Link to="/" className="flex items-center gap-2 px-6 py-5 border-b border-border/10">
          <img src={logo} alt="CloudMature" className="h-8 w-8" />
          <span className="font-bold text-primary-foreground">CloudMature</span>
        </Link>
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                tab === item.id ? "text-primary bg-primary/10 border-r-2 border-primary" : "text-secondary-foreground/60 hover:text-primary-foreground hover:bg-secondary/20"
              }`}>
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border/10">
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-secondary-foreground/60 hover:text-destructive">
            <LogOut size={16} className="mr-2" /> Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {tab === "dashboard" && <DashboardTab user={user} />}
        {tab === "projects" && <ProjectsTab user={user} />}
        {tab === "tickets" && <TicketsTab user={user} />}
        {tab === "profile" && <ProfileTab user={user} />}
      </main>
    </div>
  );
}

function DashboardTab({ user }: { user: SupaUser }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("projects").select("*").then(({ data }) => setProjects(data || []));
    supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(5).then(({ data }) => setTickets(data || []));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-1">Bienvenue, {user.user_metadata?.full_name || user.email}</h1>
      <p className="text-muted-foreground mb-8">Voici un aperçu de votre espace client.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { icon: FolderOpen, label: "Projets actifs", value: projects.filter(p => p.status === "en_cours").length, color: "text-primary" },
          { icon: LifeBuoy, label: "Tickets ouverts", value: tickets.filter(t => t.status === "ouvert").length, color: "text-accent" },
          { icon: CheckCircle2, label: "Projets complétés", value: projects.filter(p => p.status === "termine").length, color: "text-teal" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon size={20} className={stat.color} />
            </div>
            <p className="text-3xl font-bold text-card-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {projects.length > 0 && (
        <div className="bg-card rounded-xl p-6 shadow-card mb-6">
          <h3 className="font-semibold text-card-foreground mb-4">Projets récents</h3>
          <div className="space-y-4">
            {projects.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-card-foreground">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                </div>
                <div className="w-32">
                  <Progress value={p.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right mt-1">{p.progress}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {projects.length === 0 && tickets.length === 0 && (
        <div className="bg-card rounded-xl p-12 shadow-card text-center">
          <LayoutDashboard size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Aucun projet ou ticket pour le moment.</p>
          <p className="text-sm text-muted-foreground/60">Votre équipe CloudMature ajoutera vos projets ici.</p>
        </div>
      )}
    </div>
  );
}

function ProjectsTab({ user }: { user: SupaUser }) {
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("projects").select("*").order("created_at", { ascending: false }).then(({ data }) => setProjects(data || []));
  }, []);

  const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
    en_cours: { label: "En cours", icon: Clock, color: "text-primary" },
    termine: { label: "Terminé", icon: CheckCircle2, color: "text-teal" },
    en_attente: { label: "En attente", icon: AlertCircle, color: "text-muted-foreground" },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Mes Projets</h1>
      {projects.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card text-center">
          <FolderOpen size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Aucun projet pour le moment.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => {
            const sc = statusConfig[p.status] || statusConfig.en_cours;
            return (
              <div key={p.id} className="bg-card rounded-xl p-6 shadow-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-card-foreground">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-sm ${sc.color}`}>
                    <sc.icon size={14} /> {sc.label}
                  </span>
                </div>
                <Progress value={p.progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right mt-1">{p.progress}% complété</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TicketsTab({ user }: { user: SupaUser }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const loadTickets = () => {
    supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).then(({ data }) => setTickets(data || []));
  };

  useEffect(() => { loadTickets(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const { error } = await supabase.from("support_tickets").insert({ user_id: user.id, subject, message });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ticket créé!", description: "Notre équipe vous répondra rapidement." });
      setSubject(""); setMessage("");
      loadTickets();
    }
    setSending(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Support</h1>
      <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-card mb-6 space-y-4">
        <h3 className="font-semibold text-card-foreground">Nouveau ticket</h3>
        <Input placeholder="Sujet" required value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea placeholder="Décrivez votre problème..." required rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        <Button type="submit" className="gradient-primary text-primary-foreground border-0" disabled={sending}>
          <Send size={16} className="mr-2" /> {sending ? "Envoi..." : "Envoyer"}
        </Button>
      </form>

      <div className="space-y-3">
        {tickets.map((t) => (
          <div key={t.id} className="bg-card rounded-xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-card-foreground">{t.subject}</h4>
              <span className={`text-xs px-2 py-1 rounded-full ${
                t.status === "ouvert" ? "bg-primary/10 text-primary" : t.status === "en_cours" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
              }`}>{t.status}</span>
            </div>
            <p className="text-sm text-muted-foreground">{t.message}</p>
            <p className="text-xs text-muted-foreground/60 mt-2">{new Date(t.created_at).toLocaleDateString("fr-CA")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileTab({ user }: { user: SupaUser }) {
  const [profile, setProfile] = useState({ full_name: "", company: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setProfile({ full_name: data.full_name || "", company: data.company || "", phone: data.phone || "" });
    });
  }, [user.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").update(profile).eq("user_id", user.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Profil mis à jour!" });
    setSaving(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Mon Profil</h1>
      <form onSubmit={handleSave} className="bg-card rounded-xl p-6 shadow-card max-w-lg space-y-4">
        <div>
          <label className="text-sm font-medium text-card-foreground">Email</label>
          <Input value={user.email || ""} disabled className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium text-card-foreground">Nom complet</label>
          <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium text-card-foreground">Entreprise</label>
          <Input value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium text-card-foreground">Téléphone</label>
          <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="mt-1" />
        </div>
        <Button type="submit" className="gradient-primary text-primary-foreground border-0" disabled={saving}>
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </form>
    </div>
  );
}
