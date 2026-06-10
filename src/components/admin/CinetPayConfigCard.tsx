import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, CheckCircle2, XCircle, Eye, EyeOff, Copy, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ConfigState {
  enabled: boolean;
  environment: "sandbox" | "live";
  api_key_mask: string | null;
  site_id: string | null;
  secret_key_mask: string | null;
  has_api_key: boolean;
  has_site_id: boolean;
  has_secret_key: boolean;
  notify_url: string;
  return_url: string;
  updated_at: string | null;
}

export default function CinetPayConfigCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [state, setState] = useState<ConfigState | null>(null);

  const [apiKey, setApiKey] = useState("");
  const [siteId, setSiteId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showApi, setShowApi] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-cinetpay-config", {
        body: { action: "read" },
      });
      if (error) throw error;
      setState(data as ConfigState);
      setSiteId((data as ConfigState).site_id ?? "");
    } catch (e: any) {
      toast.error(e?.message || "Impossible de charger la configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (overrides?: Partial<{ enabled: boolean; environment: "sandbox" | "live" }>) => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { action: "save" };
      if (apiKey.trim()) body.api_key = apiKey.trim();
      if (siteId.trim() && siteId.trim() !== state?.site_id) body.site_id = siteId.trim();
      if (secretKey.trim()) body.secret_key = secretKey.trim();
      if (overrides?.enabled !== undefined) body.enabled = overrides.enabled;
      if (overrides?.environment) body.environment = overrides.environment;
      const { data, error } = await supabase.functions.invoke("manage-cinetpay-config", { body });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success("Configuration enregistrée");
      setApiKey(""); setSecretKey("");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-cinetpay-config", {
        body: { action: "test" },
      });
      if (error) throw error;
      if ((data as any)?.ok) toast.success("Clés CinetPay valides ✓");
      else toast.error(`Échec : ${(data as any)?.message || (data as any)?.cinetpay_code || "clés invalides"}`);
    } catch (e: any) {
      toast.error(e?.message || "Test impossible");
    } finally {
      setTesting(false);
    }
  };

  const toggleEnabled = async (next: boolean) => {
    if (next && (!state?.has_api_key || !state?.has_site_id || !state?.has_secret_key) && (!apiKey || !siteId || !secretKey)) {
      toast.error("Renseignez API Key, Site ID et Secret Key avant d'activer.");
      return;
    }
    await save({ enabled: next });
  };

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("Copié"); };

  const ready = !!state?.has_api_key && !!state?.has_site_id && !!state?.has_secret_key;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> CinetPay (paiements Afrique)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Mobile Money & cartes — GNF / XOF / XAF / CDF
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <Badge variant="outline">…</Badge>
          ) : state?.enabled ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Activé</Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-muted-foreground"><XCircle className="h-3 w-3" /> Désactivé</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
        ) : (
          <>
            {/* Enable & environment */}
            <div className="flex flex-wrap items-center gap-4 rounded-md border p-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Switch checked={!!state?.enabled} onCheckedChange={toggleEnabled} disabled={saving} />
                <Label className="text-sm">Activer le provider</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Environnement</Label>
                <Select
                  value={state?.environment ?? "sandbox"}
                  onValueChange={(v) => save({ environment: v as "sandbox" | "live" })}
                  disabled={saving}
                >
                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!ready && (
                <span className="text-xs text-amber-600">Renseignez les 3 clés pour pouvoir activer.</span>
              )}
            </div>

            {/* Credentials */}
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">API Key {state?.has_api_key && <span className="text-muted-foreground">— actuel: <code>{state.api_key_mask}</code></span>}</Label>
                <div className="flex gap-2">
                  <Input
                    type={showApi ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={state?.has_api_key ? "Laisser vide pour conserver" : "Coller la clé API CinetPay"}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowApi((v) => !v)}>
                    {showApi ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs">Site ID</Label>
                <Input value={siteId} onChange={(e) => setSiteId(e.target.value)} placeholder="Ex: 1234567" />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs">Secret Key (HMAC) {state?.has_secret_key && <span className="text-muted-foreground">— actuel: <code>{state.secret_key_mask}</code></span>}</Label>
                <div className="flex gap-2">
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder={state?.has_secret_key ? "Laisser vide pour conserver" : "Coller le Secret Key"}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowSecret((v) => !v)}>
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={() => save()} disabled={saving || (!apiKey && !secretKey && siteId === (state?.site_id ?? ""))}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null} Enregistrer
                </Button>
                <Button variant="outline" onClick={test} disabled={testing || !ready}>
                  {testing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null} Tester la connexion
                </Button>
                <a
                  href="https://admin.cinetpay.com"
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline ml-auto"
                >
                  Back-office CinetPay <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* URLs to paste in CinetPay backoffice */}
            <div className="space-y-2 rounded-md border p-3 bg-muted/10">
              <p className="text-xs font-medium">URLs à configurer dans CinetPay :</p>
              {[
                { label: "Notification (IPN)", url: state?.notify_url },
                { label: "Retour client", url: state?.return_url },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="text-muted-foreground">{row.label}</div>
                    <code className="break-all">{row.url}</code>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => row.url && copy(row.url)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {state?.updated_at && (
              <p className="text-[11px] text-muted-foreground">
                Dernière modification : {new Date(state.updated_at).toLocaleString("fr-FR")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
