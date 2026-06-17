import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plug, CheckCircle2, XCircle, AlertCircle, Copy, KeyRound, Trash2, RefreshCw,
  Webhook, Plus, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import CinetPayConfigCard from "./CinetPayConfigCard";

const PROJECT_ID = "zwzazxebufydnaxezngx";
const FUNCTIONS_BASE = `https://${PROJECT_ID}.supabase.co/functions/v1`;

const CONNECTOR_DEFS = [
  { id: "stripe", label: "Stripe Payments", desc: "Paiements & abonnements (non disponible en Guinée)", manageUrl: null as string | null, blocked: true },
  { id: "microsoft", label: "Microsoft Graph", desc: "Outlook / OneDrive / SharePoint", manageUrl: "https://entra.microsoft.com" },
  { id: "twilio", label: "Twilio", desc: "SMS OTP (MFA)", manageUrl: "https://console.twilio.com" },
  { id: "google_search_console", label: "Google Search Console", desc: "Données SEO", manageUrl: "https://search.google.com/search-console" },
  { id: "lovable_ai", label: "AI Gateway", desc: "Tuteur IA, analyse de CV", manageUrl: null },
  { id: "email_domain", label: "Emails", desc: "Envoi via notify.cloudmature.com", manageUrl: null },
];

const INBOUND_WEBHOOKS = [
  { name: "Suppression d'emails", desc: "Bounces / plaintes Mailgun", url: `${FUNCTIONS_BASE}/handle-email-suppression` },
  { name: "Désabonnement email", desc: "Lien 1-clic dans les emails", url: `${FUNCTIONS_BASE}/handle-email-unsubscribe` },
  { name: "Suivi de candidature", desc: "API publique tracking", url: `${FUNCTIONS_BASE}/application-tracking` },
  { name: "Job share / OG", desc: "Aperçu social offres d'emploi", url: `${FUNCTIONS_BASE}/job-share` },
  { name: "Vérification certificat", desc: "Vérif publique certificats formation", url: `${FUNCTIONS_BASE}/verify-certificate` },
];

type ConnStatus = Record<string, boolean>;

type ApiToken = {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

type WebhookEvent = {
  id: string;
  source: string;
  event_type: string | null;
  status: string;
  error: string | null;
  received_at: string;
};

export default function IntegrationsTab() {
  const [status, setStatus] = useState<ConnStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);

  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  const loadStatus = async () => {
    setStatusLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-integrations-status");
      if (error) throw error;
      setStatus(data?.status ?? {});
    } catch (e: any) {
      toast.error(e?.message || "Statut indisponible");
    } finally {
      setStatusLoading(false);
    }
  };

  const loadTokens = async () => {
    setTokensLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-api-token", {
        body: { action: "list" },
      });
      if (error) throw error;
      setTokens(data?.tokens ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Tokens indisponibles");
    } finally {
      setTokensLoading(false);
    }
  };

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      let q = supabase
        .from("webhook_events")
        .select("id, source, event_type, status, error, received_at")
        .order("received_at", { ascending: false })
        .limit(50);
      if (sourceFilter !== "all") q = q.eq("source", sourceFilter);
      const { data, error } = await q;
      if (error) throw error;
      setEvents((data as WebhookEvent[]) ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Journal indisponible");
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadTokens();
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceFilter]);

  const sources = useMemo(() => {
    const s = new Set(events.map((e) => e.source));
    return ["all", ...Array.from(s)];
  }, [events]);

  const copy = (txt: string, label = "Copié") => {
    navigator.clipboard.writeText(txt);
    toast.success(label);
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Donnez un nom au token");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-api-token", {
        body: { action: "create", name: newName.trim() },
      });
      if (error) throw error;
      if (!data?.value) throw new Error("Aucun token retourné");
      setRevealedToken(data.value);
      setNewName("");
      await loadTokens();
    } catch (e: any) {
      toast.error(e?.message || "Création impossible");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Révoquer ce token ? L'action est définitive.")) return;
    try {
      const { error } = await supabase.functions.invoke("manage-api-token", {
        body: { action: "revoke", id },
      });
      if (error) throw error;
      toast.success("Token révoqué");
      loadTokens();
    } catch (e: any) {
      toast.error(e?.message || "Échec de la révocation");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plug className="text-primary" /> Intégrations
          </h1>
          <p className="text-sm text-muted-foreground">
            Statut des connecteurs, webhooks entrants, clés API et journal d'événements.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadStatus(); loadTokens(); loadEvents(); }}>
          <RefreshCw className="h-4 w-4 mr-1.5" /> Actualiser
        </Button>
      </div>

      {/* 1. Connecteurs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connecteurs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {CONNECTOR_DEFS.map((c) => {
            const connected = status?.[c.id];
            return (
              <div key={c.id} className="flex items-center justify-between rounded-lg border p-3 bg-card">
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {c.label}
                    {c.blocked ? (
                      <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Indisponible</Badge>
                    ) : statusLoading ? (
                      <Badge variant="outline">…</Badge>
                    ) : connected ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Connecté</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground"><XCircle className="h-3 w-3" /> Non connecté</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                </div>
                {c.manageUrl && (
                  <a href={c.manageUrl} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline shrink-0">
                    Gérer <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 1bis. CinetPay config */}
      <CinetPayConfigCard />

      {/* 2. Webhooks entrants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-4 w-4" /> Webhooks entrants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {INBOUND_WEBHOOKS.map((w) => (
            <div key={w.url} className="flex items-center justify-between gap-3 rounded-md border p-2.5 bg-muted/20">
              <div className="min-w-0">
                <div className="text-sm font-medium">{w.name}</div>
                <code className="text-[11px] text-muted-foreground break-all">{w.url}</code>
              </div>
              <Button variant="ghost" size="sm" onClick={() => copy(w.url, "URL copiée")}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 3. API tokens */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Clés API sortantes
          </CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Générer un token
          </Button>
        </CardHeader>
        <CardContent>
          {tokensLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun token. Crée-en un pour qu'un service tiers appelle notre API.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Créé</TableHead>
                  <TableHead>Dernière utilisation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((t) => {
                  const expired = t.expires_at && new Date(t.expires_at) < new Date();
                  const revoked = !!t.revoked_at;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell><code className="text-xs">{t.token_prefix}…</code></TableCell>
                      <TableCell className="text-xs">{new Date(t.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell className="text-xs">{t.last_used_at ? new Date(t.last_used_at).toLocaleString("fr-FR") : "-"}</TableCell>
                      <TableCell>
                        {revoked ? <Badge variant="destructive">Révoqué</Badge>
                          : expired ? <Badge variant="outline" className="text-amber-600 border-amber-600">Expiré</Badge>
                          : <Badge className="bg-emerald-600 hover:bg-emerald-600">Actif</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {!revoked && (
                          <Button variant="ghost" size="sm" onClick={() => handleRevoke(t.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 4. Journal des webhooks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Journal des webhooks</CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              {sources.map((s) => <option key={s} value={s}>{s === "all" ? "Toutes sources" : s}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={loadEvents}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun événement enregistré. Les webhooks entrants apparaîtront ici dès qu'ils seront branchés sur cette table.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reçu</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Erreur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">{new Date(e.received_at).toLocaleString("fr-FR")}</TableCell>
                    <TableCell><Badge variant="outline">{e.source}</Badge></TableCell>
                    <TableCell className="text-xs">{e.event_type || "-"}</TableCell>
                    <TableCell>
                      {e.status === "processed" ? <Badge className="bg-emerald-600 hover:bg-emerald-600">processed</Badge>
                       : e.status === "failed" ? <Badge variant="destructive">failed</Badge>
                       : <Badge variant="secondary">{e.status}</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-destructive max-w-[260px] truncate">{e.error || ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create token dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setRevealedToken(null); setNewName(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{revealedToken ? "Token créé" : "Nouveau token API"}</DialogTitle>
            <DialogDescription>
              {revealedToken
                ? "Copie ce token maintenant - il ne sera plus jamais affiché."
                : "Le token donne accès à nos Edge Functions. Donne-lui un nom descriptif (ex: « Intégration Zapier »)."}
            </DialogDescription>
          </DialogHeader>

          {revealedToken ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
                <code className="text-xs break-all flex-1">{revealedToken}</code>
                <Button size="sm" variant="outline" onClick={() => copy(revealedToken, "Token copié")}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Cette valeur n'est plus récupérable après fermeture.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs">Nom</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} placeholder="Intégration Zapier" />
            </div>
          )}

          <DialogFooter>
            {revealedToken ? (
              <Button onClick={() => { setCreateOpen(false); setRevealedToken(null); }}>
                J'ai sauvegardé le token
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
                <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
                  {creating ? "Création…" : "Générer"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
