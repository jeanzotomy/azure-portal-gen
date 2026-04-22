import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// JobApplicationDialog moved to JobDetailPage
import { Briefcase, MapPin, Calendar, Clock, ChevronDown, ChevronUp, Share2, Linkedin, Facebook, Mail, Link2, MessageCircle, Search, X } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jobPath } from "@/lib/slug";

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
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [contractFilter, setContractFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const { toast } = useToast();

  const uniqueValues = (key: keyof JobPosting) =>
    Array.from(new Set(jobs.map((j) => j[key]).filter((v): v is string => !!v && typeof v === "string"))).sort();
  const departments = uniqueValues("department");
  const locations = uniqueValues("location");
  const sectors = uniqueValues("sector");
  const contractTypes = uniqueValues("contract_type");

  const filteredJobs = jobs.filter((job) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const haystack = [job.title, job.description, job.department, job.location, job.sector]
        .filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (contractFilter !== "all" && job.contract_type !== contractFilter) return false;
    if (departmentFilter !== "all" && job.department !== departmentFilter) return false;
    if (locationFilter !== "all" && job.location !== locationFilter) return false;
    if (sectorFilter !== "all" && job.sector !== sectorFilter) return false;
    return true;
  });

  const hasActiveFilters = !!search || contractFilter !== "all" || departmentFilter !== "all" || locationFilter !== "all" || sectorFilter !== "all";
  const resetFilters = () => {
    setSearch("");
    setContractFilter("all");
    setDepartmentFilter("all");
    setLocationFilter("all");
    setSectorFilter("all");
  };

  const toggleExpand = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const buildShareUrl = (job: JobPosting) =>
    `${window.location.origin}${jobPath(job.id, job.title)}`;

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

  // Application is now handled on the dedicated job detail page (/careers/:id)

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

          {!loading && jobs.length > 0 && (
            <div className="mb-8 p-4 rounded-xl border bg-card/50 backdrop-blur-sm space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par titre, mot-clé, lieu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Effacer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Select value={contractFilter} onValueChange={setContractFilter}>
                  <SelectTrigger><SelectValue placeholder="Type de contrat" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les contrats</SelectItem>
                    {contractTypes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger><SelectValue placeholder="Département" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les départements</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger><SelectValue placeholder="Lieu" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les lieux</SelectItem>
                    {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger><SelectValue placeholder="Secteur" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les secteurs</SelectItem>
                    {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{filteredJobs.length} offre{filteredJobs.length > 1 ? "s" : ""} trouvée{filteredJobs.length > 1 ? "s" : ""} sur {jobs.length}</span>
                {hasActiveFilters && (
                  <button type="button" onClick={resetFilters} className="text-primary hover:underline font-medium">
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            </div>
          )}

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

          {!loading && jobs.length > 0 && filteredJobs.length === 0 && (
            <Card>
              <CardContent className="p-10 text-center">
                <Search className="mx-auto mb-3 text-muted-foreground" size={36} />
                <h3 className="font-semibold mb-1">Aucune offre ne correspond à votre recherche</h3>
                <p className="text-sm text-muted-foreground mb-4">Essayez d'autres mots-clés ou réinitialisez les filtres.</p>
                <Button variant="outline" onClick={resetFilters}>Réinitialiser</Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md hover:border-primary/40 transition-all group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Link
                          to={jobPath(job.id, job.title)}
                          className="text-xl font-semibold hover:text-primary transition-colors"
                        >
                          {job.title}
                        </Link>
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
                        <Link
                          to={jobPath(job.id, job.title)}
                          className="mt-1 text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Lire tout <ChevronDown size={12} />
                        </Link>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Link to={jobPath(job.id, job.title)}>
                        <Button className="gradient-primary text-primary-foreground border-0 w-full">
                          Voir & Postuler
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5 w-full">
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

          {jobs.length > 0 && (
            <p className="text-center text-xs text-muted-foreground mt-6">
              Postulez en quelques clics, sans inscription requise.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
