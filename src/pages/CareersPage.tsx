import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobApplicationDialog } from "@/components/JobApplicationDialog";
import { Briefcase, MapPin, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  location: string;
  contract_type: string;
  description: string;
  closing_date: string | null;
  created_at: string;
}

export default function CareersPage() {
  const { user } = useAuthSession();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<JobPosting | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    document.title = "Carrières — CloudMature";
    (async () => {
      const { data } = await supabase
        .from("job_postings")
        .select("*")
        .eq("status", "publiee")
        .order("created_at", { ascending: false });
      if (data) setJobs(data as JobPosting[]);
      setLoading(false);
    })();
  }, []);

  const handleApply = (job: JobPosting) => {
    if (!user) {
      navigate("/auth?redirect=/careers");
      return;
    }
    setSelected(job);
    setApplyOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Briefcase size={14} className="text-primary" />
              <span className="text-sm font-medium text-primary">Carrières</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Rejoignez <span className="gradient-text">Cloud Mature</span></h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Construisons ensemble la transformation numérique de l'Afrique. Découvrez nos opportunités et postulez en quelques clics.
            </p>
          </div>

          {loading && <p className="text-center text-muted-foreground">Chargement des offres...</p>}

          {!loading && jobs.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="mx-auto mb-3 text-muted-foreground" size={40} />
                <h3 className="font-semibold mb-1">Aucune offre publiée pour le moment</h3>
                <p className="text-sm text-muted-foreground mb-4">Revenez bientôt ou envoyez-nous une candidature spontanée via le formulaire de contact.</p>
                <Link to="/#contact"><Button variant="outline">Nous contacter</Button></Link>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-xl font-semibold">{job.title}</h3>
                        <Badge variant="outline">{job.contract_type}</Badge>
                        {job.department && <Badge variant="secondary">{job.department}</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
                        <span className="flex items-center gap-1"><Clock size={14} /> Publié le {format(new Date(job.created_at), "dd/MM/yyyy")}</span>
                        {job.closing_date && (
                          <span className="flex items-center gap-1 text-destructive">
                            <Calendar size={14} /> Clôture le {format(new Date(job.closing_date), "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 whitespace-pre-line line-clamp-4">{job.description}</p>
                    </div>
                    <Button onClick={() => handleApply(job)} className="gradient-primary text-primary-foreground border-0 shrink-0">
                      Postuler
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!user && jobs.length > 0 && (
            <p className="text-center text-xs text-muted-foreground mt-6">
              Vous devez être connecté pour postuler. <Link to="/auth" className="text-primary hover:underline">Créer un compte</Link>
            </p>
          )}
        </div>
      </main>
      <Footer />
      {selected && (
        <JobApplicationDialog
          open={applyOpen}
          onOpenChange={(v) => { setApplyOpen(v); if (!v) setSelected(null); }}
          jobId={selected.id}
          jobTitle={selected.title}
        />
      )}
    </div>
  );
}
