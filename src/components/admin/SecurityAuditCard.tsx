import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type AuditResult = {
  findings: number;
  scanned_at: string;
  details: {
    tables_total: number;
    tables_without_rls: number;
    tables_without_policy: number;
    permissive_write_policies: number;
  };
};

export default function SecurityAuditCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);

  const runScan = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)("admin_security_audit");
      if (error) throw error;
      setResult(data as unknown as AuditResult);
      toast({ title: "Analyse terminée", description: `${(data as any).findings} anomalie(s) détectée(s).` });
    } catch (err: any) {
      toast({ title: "Échec de l'analyse", description: err.message ?? "Erreur inconnue", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const findings = result?.findings ?? null;
  const ok = findings === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Audit de sécurité
        </CardTitle>
        <CardDescription>
          Vérifie l'activation de RLS, les politiques manquantes et les règles trop permissives sur le schéma public.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={runScan} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Analyse en cours..." : "Réanalyser la sécurité"}
          </Button>

          {findings !== null && (
            <Badge variant={ok ? "secondary" : "destructive"} className="gap-1.5 text-sm py-1 px-3">
              {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {findings} anomalie{findings > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {result && (
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            <Stat label="Tables analysées" value={result.details.tables_total} />
            <Stat label="Sans RLS activée" value={result.details.tables_without_rls} alert={result.details.tables_without_rls > 0} />
            <Stat label="Sans aucune policy" value={result.details.tables_without_policy} alert={result.details.tables_without_policy > 0} />
            <Stat label="Policies trop permissives" value={result.details.permissive_write_policies} alert={result.details.permissive_write_policies > 0} />
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Analysé le {new Date(result.scanned_at).toLocaleString("fr-FR")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={`rounded-md border p-3 flex items-center justify-between ${alert ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30"}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${alert ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}
