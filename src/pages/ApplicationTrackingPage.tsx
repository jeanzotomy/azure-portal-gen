import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Loader2, CheckCircle2, Clock, MessageSquare, XCircle, Search, Mail, ShieldCheck, Briefcase, MapPin, Calendar } from "lucide-react";

type Status = "nouvelle" | "en_revue" | "entretien" | "acceptee" | "refusee";

interface ApplicationData {
  tracking_id: string;
  full_name: string;
  status: Status;
  created_at: string;
  updated_at: string;
  interview_message: string | null;
  job_title: string | null;
  job_department: string | null;
  job_location: string | null;
}

const STEPS: { key: Status; label: string; icon: React.ReactNode }[] = [
  { key: "nouvelle", label: "Reçue", icon: <CheckCircle2 className="h-5 w-5" /> },
  { key: "en_revue", label: "En revue", icon: <Search className="h-5 w-5" /> },
  { key: "entretien", label: "Entretien", icon: <MessageSquare className="h-5 w-5" /> },
  { key: "acceptee", label: "Décision", icon: <ShieldCheck className="h-5 w-5" /> },
];

const statusIndex = (s: Status): number => {
  if (s === "refusee" || s === "acceptee") return 3;
  return STEPS.findIndex((x) => x.key === s);
};

export default function ApplicationTrackingPage() {
  const { trackingId: paramId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [trackingId, setTrackingId] = useState(paramId?.toUpperCase() || "");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"identify" | "verify" | "result">("identify");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApplicationData | null>(null);

  useEffect(() => {
    if (paramId) setTrackingId(paramId.toUpperCase());
  }, [paramId]);

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim() || !email.trim()) return;
    setLoading(true);
    const { error } = await supabase.functions.invoke("application-tracking", {
      body: { action: "request_otp", tracking_id: trackingId.trim().toUpperCase(), email: email.trim().toLowerCase() },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Code envoyé", description: "Si la candidature existe, vous recevrez un code par email." });
    setStep("verify");
    if (paramId !== trackingId.trim().toUpperCase()) {
      navigate(`/candidature/${trackingId.trim().toUpperCase()}`, { replace: true });
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return;
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke("application-tracking", {
      body: { action: "verify_otp", tracking_id: trackingId.trim().toUpperCase(), email: email.trim().toLowerCase(), code },
    });
    setLoading(false);
    if (error || !res?.application) {
      toast({ title: "Code incorrect", description: "Vérifiez le code reçu par email.", variant: "destructive" });
      return;
    }
    setData(res.application as ApplicationData);
    setStep("result");
  };

  const currentIdx = data ? statusIndex(data.status) : -1;
  const refused = data?.status === "refusee";
  const accepted = data?.status === "acceptee";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Suivi de candidature | CloudMature</title>
        <meta name="description" content="Suivez l'état de votre candidature CloudMature en temps réel." />
        <link rel="canonical" href={`https://cloudmature.com/candidature${paramId ? `/${paramId}` : ""}`} />
      </Helmet>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-[#007aa3] bg-clip-text text-transparent">
            Suivi de candidature
          </h1>
          <p className="text-muted-foreground">Consultez l'état d'avancement de votre dossier en toute confidentialité.</p>
        </div>

        {step === "identify" && (
          <Card className="p-6 md:p-8 backdrop-blur-sm border-primary/10 shadow-xl">
            <form onSubmit={requestOtp} className="space-y-5">
              <div>
                <Label htmlFor="tid">Numéro de suivi</Label>
                <Input
                  id="tid"
                  placeholder="CM-APP000123"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                  className="mt-1.5 font-mono tracking-wider"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email utilisé pour la candidature</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-primary to-[#007aa3] hover:opacity-95">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4 mr-2" /> Recevoir le code</>}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Un code à 6 chiffres vous sera envoyé pour valider votre identité.
              </p>
            </form>
          </Card>
        )}

        {step === "verify" && (
          <Card className="p-6 md:p-8 backdrop-blur-sm border-primary/10 shadow-xl">
            <form onSubmit={verifyOtp} className="space-y-5">
              <div className="text-center mb-2">
                <ShieldCheck className="h-10 w-10 mx-auto text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Saisissez le code reçu sur <strong>{email}</strong></p>
              </div>
              <div>
                <Label htmlFor="code">Code de vérification (6 chiffres)</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="mt-1.5 text-center text-2xl tracking-[0.5em] font-mono h-14"
                  required
                />
              </div>
              <Button type="submit" disabled={loading || code.length !== 6} className="w-full h-11 bg-gradient-to-r from-primary to-[#007aa3]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vérifier"}
              </Button>
              <button type="button" onClick={() => setStep("identify")} className="text-sm text-muted-foreground hover:text-primary block mx-auto">
                ← Modifier mes informations
              </button>
            </form>
          </Card>
        )}

        {step === "result" && data && (
          <div className="space-y-6">
            <Card className="p-6 backdrop-blur-sm border-primary/10 shadow-xl">
              <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Numéro de suivi</p>
                  <p className="text-2xl font-bold text-primary font-mono">{data.tracking_id}</p>
                  <p className="text-sm text-muted-foreground mt-1">Bonjour {data.full_name}</p>
                </div>
                {refused ? (
                  <span className="px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" /> Non retenue
                  </span>
                ) : accepted ? (
                  <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Acceptée
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> En cours
                  </span>
                )}
              </div>

              {(data.job_title || data.job_location) && (
                <div className="grid sm:grid-cols-3 gap-3 p-4 rounded-lg bg-muted/50 mb-2">
                  {data.job_title && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-primary shrink-0" />
                      <span>{data.job_title}</span>
                    </div>
                  )}
                  {data.job_department && (
                    <div className="flex items-center gap-2 text-sm">
                      <Search className="h-4 w-4 text-primary shrink-0" />
                      <span>{data.job_department}</span>
                    </div>
                  )}
                  {data.job_location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span>{data.job_location}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-6 backdrop-blur-sm border-primary/10 shadow-xl">
              <h2 className="font-semibold mb-6 flex items-center gap-2"><Clock className="h-4 w-4" /> Étapes du processus</h2>
              <div className="relative">
                {STEPS.map((s, i) => {
                  const done = i < currentIdx;
                  const active = i === currentIdx;
                  const isRefusedDecision = refused && i === 3;
                  return (
                    <div key={s.key} className="flex gap-4 pb-6 last:pb-0 relative">
                      {i < STEPS.length - 1 && (
                        <div className={`absolute left-[19px] top-10 bottom-0 w-0.5 ${done ? "bg-primary" : "bg-border"}`} />
                      )}
                      <div className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all
                        ${done ? "bg-primary text-primary-foreground border-primary" :
                          active ? (isRefusedDecision ? "bg-destructive text-white border-destructive animate-pulse" : "bg-primary text-primary-foreground border-primary animate-pulse") :
                          "bg-background text-muted-foreground border-border"}`}>
                        {isRefusedDecision ? <XCircle className="h-5 w-5" /> : s.icon}
                      </div>
                      <div className="flex-1 pt-1.5">
                        <p className={`font-medium ${active || done ? "text-foreground" : "text-muted-foreground"}`}>
                          {isRefusedDecision ? "Décision : non retenue" : s.label}
                        </p>
                        {active && data.interview_message && s.key === "entretien" && (
                          <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm whitespace-pre-wrap">
                            {data.interview_message}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Soumise le {new Date(data.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</span>
                <span>Dernière mise à jour : {new Date(data.updated_at).toLocaleDateString("fr-FR")}</span>
              </div>
            </Card>

            {accepted && (
              <Card className="p-6 bg-gradient-to-br from-emerald-500/5 to-primary/5 border-emerald-500/20">
                <h3 className="font-semibold mb-2">🎉 Félicitations !</h3>
                <p className="text-sm text-muted-foreground mb-3">Votre candidature a été retenue. Consultez votre boîte mail pour le lien d'activation de votre espace collaborateur.</p>
              </Card>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
