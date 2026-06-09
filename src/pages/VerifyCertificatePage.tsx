import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, ShieldCheck, Loader2, Calendar, User, GraduationCap, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Cert = {
  verification_code: string;
  candidate_name: string;
  training_title: string;
  score: number | null;
  issued_at: string;
  expires_at: string | null;
};

export default function VerifyCertificatePage() {
  const { code } = useParams();
  const [cert, setCert] = useState<Cert | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `Vérification certificat | CloudMature`;
    (async () => {
      const safeCode = (code || "").trim().toUpperCase();
      const { data, error } = await supabase.functions.invoke("verify-certificate", {
        body: { code: safeCode },
      });
      if (error || !data || !(data as any).valid) {
        setValid(false);
      } else {
        setCert((data as any).certificate as Cert);
        setValid(true);
      }
      setLoading(false);
    })();
  }, [code]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-sm text-primary hover:underline">← Retour à CloudMature</Link>
        <header className="mt-4 mb-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Vérification d'authenticité
          </div>
          <h1 className="text-3xl font-bold mt-2 text-[#003d66]">Certificat CloudMature</h1>
        </header>

        <Card className="shadow-lg border-0">
          <CardContent className="p-8">
            {loading ? (
              <div className="flex flex-col items-center py-10 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p>Vérification en cours…</p>
              </div>
            ) : !valid || !cert ? (
              <div className="flex flex-col items-center py-10">
                <XCircle className="h-14 w-14 text-red-500 mb-3" />
                <h2 className="text-xl font-bold text-red-700">Vérification impossible</h2>
                <p className="text-sm text-muted-foreground text-center mt-3 max-w-md">
                  Ce code ne correspond pas à un certificat valide. Si vous pensez qu'il s'agit d'une erreur,
                  contactez le service Formation de CloudMature en joignant le certificat original.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center pb-6 border-b">
                  <CheckCircle2 className="h-14 w-14 text-emerald-500 mb-3" />
                  <h2 className="text-xl font-bold text-emerald-700">Certificat authentique</h2>
                  <p className="text-sm text-muted-foreground mt-1">Émis officiellement par CloudMature</p>
                </div>
                <dl className="mt-6 space-y-4 text-sm">
                  <Row icon={<User className="h-4 w-4 text-primary" />} label="Titulaire" value={cert.candidate_name} />
                  <Row icon={<GraduationCap className="h-4 w-4 text-primary" />} label="Formation" value={cert.training_title} />
                  {cert.score != null && (
                    <Row icon={<Award className="h-4 w-4 text-primary" />} label="Score" value={`${cert.score}%`} />
                  )}
                  <Row icon={<Calendar className="h-4 w-4 text-primary" />} label="Délivré le"
                    value={new Date(cert.issued_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} />
                  {cert.expires_at && (
                    <Row icon={<Calendar className="h-4 w-4 text-primary" />} label="Expire le"
                      value={new Date(cert.expires_at).toLocaleDateString("fr-FR")} />
                  )}
                  <div className="pt-2 flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">{cert.verification_code}</Badge>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">Valide</Badge>
                  </div>
                </dl>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Pour des raisons de sécurité, aucune information n'est divulguée pour les codes invalides.
        </p>
      </div>
    </main>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 grid grid-cols-3 gap-2">
        <dt className="text-muted-foreground col-span-1">{label}</dt>
        <dd className="col-span-2 font-medium text-[#003d66]">{value}</dd>
      </div>
    </div>
  );
}
