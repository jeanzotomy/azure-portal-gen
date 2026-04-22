import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobApplicationDialog } from "@/components/JobApplicationDialog";
import { Briefcase, MapPin, Calendar, Clock, Share2, Linkedin, Facebook, Mail, Link2, MessageCircle, ArrowLeft, Building2, BadgeDollarSign, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { extractJobId, jobPath, slugify } from "@/lib/slug";

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
  status: string;
}

const setMeta = (selector: string, attr: "content" | "href", value: string) => {
  let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el) {
    if (selector.startsWith("meta")) {
      el = document.createElement("meta");
      const m = selector.match(/\[(name|property)="([^"]+)"\]/);
      if (m) el.setAttribute(m[1], m[2]);
    } else if (selector.startsWith("link")) {
      el = document.createElement("link");
      const m = selector.match(/\[rel="([^"]+)"\]/);
      if (m) el.setAttribute("rel", m[1]);
    }
    if (el) document.head.appendChild(el);
  }
  if (el) (el as any)[attr] = value;
};

const DEFAULT_META = {
  title: "CloudMature | Cloud · DevOps · IA — Conakry, Guinée",
  description: "Cloud Mature — Entreprise de technologies spécialisée en Cloud (Azure, AWS, GCP), DevOps et Intelligence Artificielle. Conakry, Guinée.",
  url: "https://cloudmature.com/",
  image: "https://cloudmature.com/og-image.jpg",
};

export default function JobDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const { toast } = useToast();

  const jobId = extractJobId(slug);

  useEffect(() => {
    if (!jobId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("job_postings")
        .select("*")
        .eq("id", jobId)
        .eq("status", "publiee")
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setJob(data as JobPosting);
      setLoading(false);
      // If user landed via plain UUID or outdated slug, normalise the URL.
      const expected = jobPath(data.id, (data as any).title);
      if (slug !== expected.replace("/careers/", "")) {
        navigate(expected, { replace: true });
      }
    })();
  }, [jobId, slug, navigate]);

  // Dynamic SEO + Open Graph for social sharing
  useEffect(() => {
    if (!job) return;
    const path = jobPath(job.id, job.title);
    const url = `https://cloudmature.com${path}`;
    const title = `${job.title} — ${job.contract_type} · ${job.location} | CloudMature`;
    const desc = (job.description || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
    const description = desc
      ? `${desc}${desc.length === 200 ? "…" : ""}`
      : `Offre d'emploi chez CloudMature : ${job.title} (${job.contract_type}) — ${job.location}.`;

    document.title = title;
    setMeta('meta[name="description"]', "content", description);
    setMeta('link[rel="canonical"]', "href", url);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:type"]', "content", "article");
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);

    // JSON-LD JobPosting
    const ld = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: job.title,
      description: job.description,
      datePosted: job.created_at,
      validThrough: job.closing_date || undefined,
      employmentType: job.contract_type,
      hiringOrganization: {
        "@type": "Organization",
        name: "CloudMature",
        sameAs: "https://cloudmature.com",
      },
      jobLocation: {
        "@type": "Place",
        address: { "@type": "PostalAddress", addressLocality: job.location },
      },
      industry: job.sector || undefined,
      baseSalary: job.salary_range || undefined,
      url,
    };
    let script = document.getElementById("jobposting-jsonld") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "jobposting-jsonld";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(ld);

    return () => {
      // Restore defaults when leaving the page
      document.title = DEFAULT_META.title;
      setMeta('meta[name="description"]', "content", DEFAULT_META.description);
      setMeta('link[rel="canonical"]', "href", DEFAULT_META.url);
      setMeta('meta[property="og:title"]', "content", DEFAULT_META.title);
      setMeta('meta[property="og:description"]', "content", DEFAULT_META.description);
      setMeta('meta[property="og:url"]', "content", DEFAULT_META.url);
      setMeta('meta[property="og:type"]', "content", "website");
      setMeta('meta[name="twitter:title"]', "content", DEFAULT_META.title);
      setMeta('meta[name="twitter:description"]', "content", DEFAULT_META.description);
      const s = document.getElementById("jobposting-jsonld");
      if (s) s.remove();
    };
  }, [job]);

  const shareUrl = job ? `${window.location.origin}/careers/${job.id}` : "";
  // Bots get per-job OG tags via the edge function; humans are redirected
  // back to the SPA. We use this URL when sharing externally so previews
  // show the offer's title/description instead of the site default.
  const socialShareUrl = job
    ? `https://zwzazxebufydnaxezngx.supabase.co/functions/v1/job-share?id=${job.id}`
    : "";
  const shareText = job
    ? `Offre d'emploi chez Cloud Mature : ${job.title} (${job.contract_type}) — ${job.location}`
    : "";

  const shareTo = (network: "linkedin" | "facebook" | "x" | "whatsapp" | "email") => {
    const url = encodeURIComponent(socialShareUrl);
    const text = encodeURIComponent(shareText);
    const map: Record<typeof network, string> = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      email: `mailto:?subject=${text}&body=${text}%0A%0A${url}`,
    };
    window.open(map[network], "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(socialShareUrl);
      toast({ title: "Lien copié", description: "Le lien de partage est dans le presse-papier." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de copier le lien.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16">
          <div className="container max-w-4xl">
            <p className="text-center text-muted-foreground">Chargement de l'offre...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16">
          <div className="container max-w-2xl">
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="mx-auto mb-3 text-muted-foreground" size={40} />
                <h1 className="text-xl font-semibold mb-2">Offre introuvable</h1>
                <p className="text-sm text-muted-foreground mb-4">
                  Cette offre n'est plus disponible ou a été retirée.
                </p>
                <Button onClick={() => navigate("/careers")} variant="outline">
                  <ArrowLeft size={14} className="mr-2" /> Voir toutes les offres
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-4xl">
          <div className="mb-6">
            <Link
              to="/careers"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft size={14} /> Toutes les offres
            </Link>
          </div>

          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary via-primary to-[#005f80] text-primary-foreground p-6 md:p-8 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-8 w-44 h-44 rounded-full bg-white/10 blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 mb-3 text-xs">
                  <Briefcase size={12} /> Offre d'emploi
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mb-3 leading-tight">{job.title}</h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className="bg-white/15 hover:bg-white/20 text-primary-foreground border border-white/20 backdrop-blur-sm gap-1">
                    {job.contract_type}
                    {job.contract_type === "CDD" && job.contract_duration ? ` · ${job.contract_duration}` : ""}
                    {job.contract_type === "CDD" && job.renewable ? " · renouvelable" : ""}
                  </Badge>
                  {job.department && (
                    <Badge className="bg-white/15 hover:bg-white/20 text-primary-foreground border border-white/20 backdrop-blur-sm">
                      <Building2 size={11} className="mr-1" /> {job.department}
                    </Badge>
                  )}
                  <Badge className="bg-white/15 hover:bg-white/20 text-primary-foreground border border-white/20 backdrop-blur-sm">
                    <MapPin size={11} className="mr-1" /> {job.location}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button
                    onClick={() => setApplyOpen(true)}
                    size="lg"
                    className="bg-white text-primary hover:bg-white/90"
                  >
                    Postuler maintenant
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="lg"
                        className="bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground gap-1.5"
                      >
                        <Share2 size={14} /> Partager
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem onClick={() => shareTo("linkedin")}>
                        <Linkedin size={14} className="mr-2 text-[#0A66C2]" /> LinkedIn
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => shareTo("whatsapp")}>
                        <MessageCircle size={14} className="mr-2 text-[#25D366]" /> WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => shareTo("facebook")}>
                        <Facebook size={14} className="mr-2 text-[#1877F2]" /> Facebook
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => shareTo("x")}>
                        <span className="mr-2 font-bold w-3.5 text-center">𝕏</span> X (Twitter)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => shareTo("email")}>
                        <Mail size={14} className="mr-2" /> Email
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={copyLink}>
                        <Link2 size={14} className="mr-2" /> Copier le lien
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Clock size={12} /> Publié le
                  </div>
                  <div className="text-sm font-medium">{format(new Date(job.created_at), "dd/MM/yyyy")}</div>
                </div>
                {job.closing_date && (
                  <div className="p-3 rounded-lg border bg-destructive/5 border-destructive/30">
                    <div className="flex items-center gap-1.5 text-xs text-destructive mb-1">
                      <Calendar size={12} /> Clôture
                    </div>
                    <div className="text-sm font-medium">{format(new Date(job.closing_date), "dd/MM/yyyy")}</div>
                  </div>
                )}
                {job.start_date && (
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <CalendarClock size={12} /> Prise de poste
                    </div>
                    <div className="text-sm font-medium">{job.start_date}</div>
                  </div>
                )}
                {job.salary_range && (
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <BadgeDollarSign size={12} /> Rémunération
                    </div>
                    <div className="text-sm font-medium">{job.salary_range}</div>
                  </div>
                )}
                {job.sector && (
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Building2 size={12} /> Secteur
                    </div>
                    <div className="text-sm font-medium">{job.sector}</div>
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-3">Description du poste</h2>
                <p className="text-sm text-foreground/85 whitespace-pre-line leading-relaxed">
                  {job.description}
                </p>
              </div>

              <div className="pt-4 border-t flex flex-wrap gap-3 items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Intéressé(e) ? Postulez en quelques clics, sans inscription requise.
                </p>
                <Button onClick={() => setApplyOpen(true)} className="gradient-primary text-primary-foreground border-0">
                  Postuler à cette offre
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      <JobApplicationDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        jobId={job.id}
        jobTitle={job.title}
      />
    </div>
  );
}
