import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/use-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Mail, Phone, Building2, MapPin, Globe, Clock, Calendar,
  Shield, ShieldBan, ShieldCheck, UserCog, Receipt, FolderOpen, LifeBuoy,
  GraduationCap, FileSignature, Pencil,
} from "lucide-react";

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  company: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address_line: string | null;
  timezone: string | null;
  blocked: boolean | null;
  deleted_at: string | null;
  created_at: string;
  updated_at?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  agent: "Agent",
  comptable: "Comptable",
  gestionnaire: "Gestionnaire",
  hr: "Ressources humaines",
  onboarding: "Onboarding",
  client: "Client",
};

export default function UserDetailPage() {
  const { userId = ""
  } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useUserRoles();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [mfa, setMfa] = useState<{ enrolled: boolean; factors: any[] } | null>(null);
  const [counts, setCounts] = useState({ projects: 0, tickets: 0, invoices: 0, contracts: 0, trainings: 0 });
  const [billable, setBillable] = useState<{ id: string; client_name: string } | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [{ data: prof }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (!active) return;
      setProfile(prof as ProfileRow | null);
      setRoles((roleRows || []).map((r: any) => r.role));

      // Billable link
      const { data: linkRows } = await supabase
        .from("service_clients")
        .select("id, client_name")
        .eq("user_id", userId)
        .limit(1);
      if (active) setBillable((linkRows && linkRows[0]) || null);

      // Counts (RLS-safe; admin only)
      const safeCount = async (table: string, col = "user_id") => {
        const { count } = await supabase
          .from(table as any)
          .select("id", { count: "exact", head: true })
          .eq(col, userId);
        return count || 0;
      };
      const [pCount, tCount, iCount, cCount, trCount] = await Promise.all([
        safeCount("projects", "owner_id").catch(() => 0),
        safeCount("support_tickets").catch(() => 0),
        safeCount("invoices").catch(() => 0),
        safeCount("onboarding_contracts").catch(() => 0),
        safeCount("onboarding_assigned_trainings").catch(() => 0),
      ]);
      if (active) setCounts({ projects: pCount, tickets: tCount, invoices: iCount, contracts: cCount, trainings: trCount });

      // MFA + email via edge function
      try {
        const { data: mfaData } = await supabase.functions.invoke("manage-user-mfa", {
          body: { action: "list", target_user_id: userId },
        });
        if (active && mfaData) {
          setMfa({ enrolled: !!mfaData.enrolled, factors: mfaData.factors || [] });
          if (mfaData.email) setEmail(mfaData.email);
        }
      } catch { /* ignore */ }

      if (active) setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [userId]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft size={14} /> Retour
        </Button>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Utilisateur introuvable.</CardContent></Card>
      </div>
    );
  }

  const initial = (profile.full_name || "?").charAt(0).toUpperCase();
  const status = profile.deleted_at ? "deleted" : profile.blocked ? "blocked" : "active";

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm"
  className="gap-2">
          <Link to="/admin?role=client" aria-label="Retour à la liste des utilisateurs">
            <ArrowLeft size={14} /> Utilisateurs
          </Link>
        </Button>
        {isAdmin && (
          <Button variant="outline" size="sm"
  className="gap-2" onClick={() => navigate(`/admin?q=${encodeURIComponent(profile.full_name || profile.user_id)}`)}>
            <Pencil size={14} /> Gérer dans la liste
          </Button>
        )}
      </div>

      {/* Header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold flex-shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground">{profile.full_name || "Nom non renseigné"}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {roles.length === 0 && <Badge variant="secondary">client</Badge>}
                {roles.map((r) => (
                  <Badge key={r} variant="secondary"
  className="capitalize">{ROLE_LABELS[r] || r}</Badge>
                ))}
                {status === "active" && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 border"><ShieldCheck size={11} className="mr-1" /> Actif</Badge>}
                {status === "blocked" && <Badge className="bg-destructive/10 text-destructive border-destructive/20 border"><ShieldBan size={11} className="mr-1" /> Bloqué</Badge>}
                {status === "deleted" && <Badge variant="destructive">Supprimé</Badge>}
                {mfa?.enrolled && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 border"><Shield size={11} className="mr-1" /> MFA actif</Badge>}
                {billable && <Badge className="bg-teal-500/10 text-teal-600 border-teal-500/20 border"><Receipt size={11} className="mr-1" /> Facturable</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Coordonnées */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><UserCog size={16} className="text-primary" /> Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow icon={Mail} label="Email" value={email} />
            <InfoRow icon={Phone} label="Téléphone" value={profile.phone} />
            <InfoRow icon={Building2} label="Entreprise" value={profile.company} />
            <InfoRow icon={MapPin} label="Adresse" value={[profile.address_line, profile.city, profile.country].filter(Boolean).join(", ") || null} />
            <InfoRow icon={Globe} label="Pays" value={profile.country} />
            <InfoRow icon={Clock} label="Fuseau horaire" value={profile.timezone} />
            <InfoRow icon={Calendar} label="Inscrit le" value={new Date(profile.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric"
  })} />
          </CardContent>
        </Card>

        {/* Activité */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><FolderOpen size={16} className="text-primary" /> Activité</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatTile icon={FolderOpen} label="Projets" value={counts.projects} />
            <StatTile icon={LifeBuoy} label="Tickets" value={counts.tickets} />
            <StatTile icon={Receipt} label="Factures" value={counts.invoices} />
            <StatTile icon={FileSignature} label="Contrats" value={counts.contracts} />
            <StatTile icon={GraduationCap} label="Formations" value={counts.trainings} />
            {billable && (
              <Link to={`/admin/?tab=service-clients&q=${encodeURIComponent(billable.client_name)}`} className="col-span-2 sm:col-span-1 rounded-lg border border-teal-500/30 bg-teal-500/5 p-3 hover:bg-teal-500/10 transition">
                <div className="text-[10px] uppercase tracking-wide text-teal-700/80">Client facturable</div>
                <div className="text-sm font-semibold truncate">{billable.client_name}</div>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sécurité */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Shield size={16} className="text-primary" /> Sécurité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Authentification multi-facteurs</span>
            <span className="font-medium">
              {mfa?.enrolled ? `${mfa.factors.length} facteur${mfa.factors.length > 1 ? "s" : ""} actif${mfa.factors.length > 1 ? "s" : ""}` : "Non configurée"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Statut du compte</span>
            <span className="font-medium capitalize">{status === "active" ? "Actif" : status === "blocked" ? "Bloqué" : "Supprimé"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
      <Icon size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground break-words">{value || <span className="text-muted-foreground/60 italic">Non renseigné</span>}</div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon size={14} />
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground mt-1">{value}</div>
    </div>
  );
}
