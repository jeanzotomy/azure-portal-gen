import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, RefreshCw, Calendar, MapPin, ExternalLink, Search, X } from "lucide-react";
import { format } from "date-fns";
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

  const load = async () => {
    setLoading(true);
    const { data: appsData } = await supabase
      .from("job_applications")
      .select("id, job_id, full_name, email, status, created_at, years_experience, salary_expectation")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const applications = (appsData || []) as Application[];
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
  };

  useEffect(() => { load(); }, [user.id]);

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
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw size={14} /> Actualiser
          </Button>
          <Link to="/careers">
            <Button size="sm" variant="outline">
              <ExternalLink size={14} /> Voir les offres
            </Button>
          </Link>
        </div>
      </div>

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

      <div className="space-y-3">
        {apps.map((app) => {
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
