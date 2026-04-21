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
import { Briefcase, MapPin, Calendar, Clock, ChevronDown, ChevronUp, Share2, Linkedin, Facebook, Mail, Link2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  location: string;
  contract_type: string;
  description: string;
  closing_date: string | null;
  created_at: string;
  sector: string | null;
  start_date: string | null;
  salary_range: string | null;
  contract_duration: string | null;
  renewable: boolean;
}

export default function CareersPage() {
  const { user } = useAuthSession();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<JobPosting | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const toggleExpand = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const buildShareUrl = (job: JobPosting) =>
    `${window.location.origin}/careers?job=${job.id}`;

  const buildShareText = (job: JobPosting) =>
    `Offre d'emploi chez Cloud Mature : ${job.title} (${job.contract_type}) — ${job.location}`;

  const shareTo = (network: "linkedin" | "facebook" | "x" | "whatsapp" | "email", job: JobPosting) => {
    const url = encodeURIComponent(buildShareUrl(job));
    const text = encodeURIComponent(buildShareText(job));
    const map: Record<typeof network, string> = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      email: `mailto:?subject=${text}&body=${text}%0A%0A${url}`,
    };
    window.open(map[network], "_blank", "noopener,noreferrer");
  };

  const copyLink = async (job: JobPosting) => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(job));
      toast({ title: "Lien copié", description: "Le lien de l'offre est dans le presse-papier." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de copier le lien.", variant: "destructive" });
    }
  };

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
                        <Badge variant="outline">
                          {job.contract_type}
                          {job.contract_type === "CDD" && job.contract_duration ? ` · ${job.contract_duration}` : ""}
                          {job.contract_type === "CDD" && job.renewable ? " · renouvelable" : ""}
                        </Badge>
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
                      {(job.sector || job.start_date || job.salary_range) && (
                        <div className="grid sm:grid-cols-3 gap-2 text-xs mb-3 p-3 rounded-lg bg-muted/40 border">
                          {job.sector && <div><span className="font-semibold text-foreground">Secteur :</span> <span className="text-muted-foreground">{job.sector}</span></div>}
                          {job.start_date && <div><span className="font-semibold text-foreground">Prise de poste :</span> <span className="text-muted-foreground">{job.start_date}</span></div>}
                          {job.salary_range && <div><span className="font-semibold text-foreground">Rémunération :</span> <span className="text-muted-foreground">{job.salary_range}</span></div>}
                        </div>
                      )}
                      <h4 className="text-sm font-semibold mb-1 text-foreground">Description du poste</h4>
                      <p className={`text-sm text-foreground/80 whitespace-pre-line ${expanded[job.id] ? "" : "line-clamp-4"}`}>{job.description}</p>
                      {job.description.length > 200 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(job.id)}
                          className="mt-1 text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {expanded[job.id] ? (<>Réduire <ChevronUp size={12} /></>) : (<>Lire tout <ChevronDown size={12} /></>)}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button onClick={() => handleApply(job)} className="gradient-primary text-primary-foreground border-0">
                        Postuler
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <Share2 size={14} /> Partager
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => shareTo("linkedin", job)}>
                            <Linkedin size={14} className="mr-2 text-[#0A66C2]" /> LinkedIn
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => shareTo("whatsapp", job)}>
                            <MessageCircle size={14} className="mr-2 text-[#25D366]" /> WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => shareTo("facebook", job)}>
                            <Facebook size={14} className="mr-2 text-[#1877F2]" /> Facebook
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => shareTo("x", job)}>
                            <span className="mr-2 font-bold text-foreground w-3.5 text-center">𝕏</span> X (Twitter)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => shareTo("email", job)}>
                            <Mail size={14} className="mr-2" /> Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => copyLink(job)}>
                            <Link2 size={14} className="mr-2" /> Copier le lien
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
