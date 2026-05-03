import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, RefreshCw, Calendar, MapPin, ExternalLink, Search, X, Link2, Sparkles, FileSignature, FileUp, GraduationCap, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { User as SupaUser } from "@supabase/supabase-js";

type AppStatus = "nouvelle" | "en_revue" | "entretien" | "acceptee" | "refusee";

interface Application {
  id: string;
  job_id: string;
  full_name: string;
  email: string;
  status: AppStatus;
  created_at: string;
  years_experience: number | null;
  salary_expectation: string | null;
}

interface Job {
  id: string;
  title: string;
  department: string | null;
  location: string;
  contract_type: string;
  status: string;
}

const STATUS_LABELS: Record<AppStatus, string> = {
  nouvelle: "Reçue",
  en_revue: "En revue",
  entretien: "Entretien",
  acceptee: "Acceptée",
  refusee: "Refusée",
};

const STATUS_COLORS: Record<AppStatus, string> = {
  nouvelle: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  en_revue: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  entretien: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  acceptee: "bg-green-500/10 text-green-600 border-green-500/20",
  refusee: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_DESCRIPTIONS: Record<AppStatus, string> = {
  nouvelle: "Votre candidature a bien été enregistrée. L'équipe RH va l'examiner prochainement.",
  en_revue: "Votre dossier est actuellement étudié par notre équipe RH.",
  entretien: "Félicitations ! Vous êtes sélectionné(e) pour un entretien. Vous serez contacté(e) sous peu.",
  acceptee: "Bravo ! Votre candidature a été acceptée. Bienvenue dans l'équipe.",
  refusee: "Votre candidature n'a pas été retenue. Nous vous remercions pour votre intérêt.",
};

export default function ApplicationsTab({ user }: { user: SupaUser }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [contractFilter, setContractFilter] = useState<string>("all");
  const [linkedCount, setLinkedCount] = useState(0);
  const hasLoadedRef = useState({ done: false })[0];

  const load = async (manual = false) => {
    setLoading(true);
    const email = user.email || "";
    const { data: appsData } = await supabase
      .from("job_applications")
      .select("id, job_id, full_name, email, user_id, status, created_at, years_experience, salary_expectation")
      .or(`user_id.eq.${user.id}${email ? `,email.eq.${email}` : ""}`)
      .order("created_at", { ascending: false });

    const applications = (appsData || []) as (Application & { user_id: string | null })[];

    // Auto-link orphan applications to this user
    const orphanIds = applications.filter((a) => !a.user_id).map((a) => a.id);
    if (orphanIds.length > 0) {
      await supabase.from("job_applications").update({ user_id: user.id }).in("id", orphanIds);
      setLinkedCount((c) => c + orphanIds.length);
      toast.success(
        `${orphanIds.length} candidature${orphanIds.length > 1 ? "s" : ""} rattachée${orphanIds.length > 1 ? "s" : ""} à votre compte`,
        { description: "Vos anciennes candidatures sont désormais liées à votre profil.", icon: "🔗" }
      );
    } else if (manual) {
      toast.success("Liste à jour", { description: "Aucune nouvelle candidature à rattacher." });
    }

    setApps(applications);

    if (applications.length > 0) {
      const jobIds = Array.from(new Set(applications.map((a) => a.job_id)));
      const { data: jobsData } = await supabase
        .from("job_postings")
        .select("id, title, department, location, contract_type, status")
        .in("id", jobIds);
      const map: Record<string, Job> = {};
      (jobsData || []).forEach((j) => { map[j.id] = j as Job; });
      setJobs(map);
    }
    setLoading(false);
    hasLoadedRef.done = true;
  };

  useEffect(() => { load(false); }, [user.id]);

  const filteredApps = apps.filter((a) => {
    const job = jobs[a.job_id];
    const q = search.trim().toLowerCase();
    if (q) {
      const haystack = [job?.title, job?.location, job?.department].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (contractFilter !== "all" && job?.contract_type !== contractFilter) return false;
    return true;
  });
  const contractTypes = Array.from(new Set(Object.values(jobs).map((j) => j.contract_type).filter(Boolean)));
  const hasActiveFilters = !!search || statusFilter !== "all" || contractFilter !== "all";
  const resetFilters = () => { setSearch(""); setStatusFilter("all"); setContractFilter("all"); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="text-primary" /> Mes candidatures
          </h1>
          <p className="text-sm text-muted-foreground">Suivez l'état de vos candidatures aux offres d'emploi.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)}>
            <RefreshCw size={14} /> Actualiser
          </Button>
          <Link to="/careers">
            <Button size="sm" variant="outline">
              <ExternalLink size={14} /> Voir les offres
            </Button>
          </Link>
        </div>
      </div>

      {linkedCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 text-sm">
          <Link2 size={16} className="flex-shrink-0" />
          <span>
            <strong>{linkedCount}</strong> candidature{linkedCount > 1 ? "s ont été rattachées" : " a été rattachée"} à votre compte automatiquement.
          </span>
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Chargement...</p>}

      {!loading && apps.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="mx-auto mb-3 text-muted-foreground" size={40} />
            <h3 className="font-semibold mb-1">Aucune candidature</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Vous n'avez pas encore postulé à une offre. Découvrez nos opportunités.
            </p>
            <Link to="/careers">
              <Button size="sm">Voir les offres</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!loading && apps.length > 0 && (
        <div className="p-4 rounded-xl border bg-card/50 backdrop-blur-sm space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre d'offre, lieu, département..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Effacer">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="nouvelle">Reçue</SelectItem>
                <SelectItem value="en_revue">En revue</SelectItem>
                <SelectItem value="entretien">Entretien</SelectItem>
                <SelectItem value="acceptee">Acceptée</SelectItem>
                <SelectItem value="refusee">Refusée</SelectItem>
              </SelectContent>
            </Select>
            <Select value={contractFilter} onValueChange={setContractFilter}>
              <SelectTrigger><SelectValue placeholder="Type de contrat" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les contrats</SelectItem>
                {contractTypes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{filteredApps.length} candidature{filteredApps.length > 1 ? "s" : ""} sur {apps.length}</span>
            {hasActiveFilters && (
              <button type="button" onClick={resetFilters} className="text-primary hover:underline font-medium">Réinitialiser</button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredApps.map((app) => {
          const job = jobs[app.job_id];
          return (
            <Card key={app.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-lg">{job?.title || "Offre supprimée"}</h3>
                      <Badge variant="outline" className={STATUS_COLORS[app.status]}>
                        {STATUS_LABELS[app.status]}
                      </Badge>
                      {job?.contract_type && <Badge variant="outline">{job.contract_type}</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {job?.location && (
                        <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
                      )}
                      {job?.department && <span>{job.department}</span>}
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> Postulé le {format(new Date(app.created_at), "dd/MM/yyyy")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`p-3 rounded-lg border text-sm ${STATUS_COLORS[app.status]}`}>
                  {STATUS_DESCRIPTIONS[app.status]}
                </div>

                {app.status === "acceptee" && (
                  <div className="mt-3 p-4 rounded-lg border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                      <Sparkles size={18} /> Votre intégration commence !
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Accédez à votre espace d'onboarding pour signer votre contrat, déposer vos documents administratifs et démarrer vos formations.
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                      <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-white/60 border">
                        <FileSignature size={16} className="text-primary" />
                        <span>Signer le contrat</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-white/60 border">
                        <FileUp size={16} className="text-primary" />
                        <span>Téléverser docs</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-white/60 border">
                        <GraduationCap size={16} className="text-primary" />
                        <span>Démarrer formations</span>
                      </div>
                    </div>
                    <Link to="/portal?tab=onboarding">
                      <Button className="w-full bg-gradient-to-r from-primary to-[#007aa3] hover:opacity-90">
                        Accéder à mon onboarding <ArrowRight size={16} />
                      </Button>
                    </Link>
                  </div>
                )}

                {(app.years_experience !== null || app.salary_expectation) && (
                  <div className="mt-3 pt-3 border-t flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {app.years_experience !== null && <span>💼 {app.years_experience} ans d'expérience</span>}
                    {app.salary_expectation && <span>💰 Prétention : {app.salary_expectation}</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
