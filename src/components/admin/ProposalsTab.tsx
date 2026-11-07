import { useEffect, useState, type InputHTMLAttributes } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Copy, FileText, Minus, Plus, Printer, Save, Trash2, ArrowLeft, Sparkles, Search, ChevronLeft, ChevronRight, Download, Mail } from "lucide-react";
import { toast } from "sonner";
import { useFormDraft } from "@/lib/form-draft";
import { calculateProposalTax, isValidProposalTax } from "@/lib/proposal-tax";
import { filterProposals, paginateProposals } from "@/lib/proposal-list";
import { generateProposalPdf, generateProposalWord, proposalFilename, blobToBase64 } from "@/lib/proposal-documents";
import { saveAs } from "file-saver";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export type FeatureValue = "inclus" | "non" | "option";
export interface ProposalOption { name: string; objective: string; price_min: number; price_max: number; delay: string; tax_rate?: number; }
export interface ProposalFeature { label: string; values: FeatureValue[]; service_id?: string; }
export interface ProposalMilestone { label: string; percent: number; }
export interface Proposal {
  id?: string; title: string; client_name: string; client_contact: string | null; client_email: string | null;
  summary: string | null; options: ProposalOption[]; features: ProposalFeature[]; milestones: ProposalMilestone[];
  status: string; accepted_option: number | null; valid_until: string | null; created_at?: string;
}

const STATUSES: Record<string, string> = { brouillon: "Brouillon", envoyee: "Envoyée", acceptee: "Acceptée", refusee: "Refusée" };

export const formatGnf = (n: number) => `${Math.round(n || 0).toLocaleString("fr-FR").replace(/\s/g, " ")} GNF`;
export const milestonesTotal = (m: ProposalMilestone[]) => m.reduce((s, x) => s + (Number(x.percent) || 0), 0);

/** Saisie monétaire : jamais de montant négatif, jamais de valeur non numérique. */
export const toNonNegative = (raw: unknown) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Champ numérique qui refuse le signe moins à la frappe, à la molette et au collage. */
const NonNegativeInput = ({ value, onChange, ...props }: { value: number; onChange: (n: number) => void } & InputHTMLAttributes<HTMLInputElement>) => (
  <Input
    type="number"
    min={0}
    onKeyDown={(x) => { if (["-", "+", "e", "E"].includes(x.key)) x.preventDefault(); }}
    onDrop={(x) => x.preventDefault()}
    value={value === 0 ? "" : value}
    onChange={(x) => onChange(toNonNegative(x.target.value))}
    {...props}
  />
);

const MILESTONE_PRESETS: { label: string; milestones: ProposalMilestone[] }[] = [
  { label: "50 / 50", milestones: [{ label: "À la signature", percent: 50 }, { label: "À la livraison", percent: 50 }] },
  { label: "40 / 30 / 30", milestones: [{ label: "À la signature", percent: 40 }, { label: "Validation des maquettes et recette", percent: 30 }, { label: "Mise en ligne et formation", percent: 30 }] },
  { label: "30 / 40 / 30", milestones: [{ label: "À la signature", percent: 30 }, { label: "Jalon intermédiaire", percent: 40 }, { label: "À la livraison", percent: 30 }] },
  { label: "100 % livraison", milestones: [{ label: "À la livraison", percent: 100 }] },
];

export const DELAYS = ["2 semaines", "3 à 4 semaines", "1 mois", "6 à 8 semaines", "8 à 10 semaines", "2 à 3 mois", "À définir"];

// Bibliothèque de fonctionnalités : chaque entrée propose une valeur par défaut pour 2 options.
export const FEATURE_LIBRARY: { label: string; v: [FeatureValue, FeatureValue] }[] = [
  { label: "Design sur mesure (mobile, tablette, ordinateur)", v: ["inclus", "inclus"] },
  { label: "Pages institutionnelles (accueil, services, flotte, références, carrières)", v: ["inclus", "inclus"] },
  { label: "Français / anglais", v: ["inclus", "inclus"] },
  { label: "Section qualité, sécurité, environnement", v: ["inclus", "inclus"] },
  { label: "Formulaire de demande de devis", v: ["inclus", "inclus"] },
  { label: "Référencement local (SEO)", v: ["option", "inclus"] },
  { label: "Espace client sécurisé", v: ["non", "inclus"] },
  { label: "Suivi des dossiers / expéditions", v: ["non", "inclus"] },
  { label: "Documents PDF automatiques (bordereaux, factures)", v: ["non", "inclus"] },
  { label: "Alertes SMS / WhatsApp / email", v: ["non", "inclus"] },
  { label: "Connexion aux logiciels existants (Sage, Microsoft 365…)", v: ["non", "option"] },
  { label: "Hébergement, sécurité et sauvegardes", v: ["inclus", "inclus"] },
  { label: "Maintenance et support", v: ["option", "option"] },
  { label: "Formation des équipes", v: ["option", "inclus"] },
  // Fonctionnalités propres aux applications métier
  { label: "Gestion des utilisateurs et des rôles (droits par profil)", v: ["inclus", "inclus"] },
  { label: "Formulaires métier avec contrôles de saisie", v: ["inclus", "inclus"] },
  { label: "Tableaux de bord et indicateurs de suivi", v: ["inclus", "inclus"] },
  { label: "Notifications internes et alertes automatiques", v: ["option", "inclus"] },
  { label: "Circuit d'approbation (validation en cascade)", v: ["non", "inclus"] },
  { label: "Génération automatique de documents (PDF)", v: ["option", "inclus"] },
  { label: "Intégration avec vos logiciels (ERP, comptabilité…)", v: ["non", "option"] },
  { label: "Mode hors-ligne (zones à faible connexion)", v: ["non", "option"] },
  { label: "Journal d'audit des actions", v: ["option", "inclus"] },
  { label: "Application mobile (Android / iOS)", v: ["option", "option"] },
  { label: "API ouverte pour vos partenaires", v: ["non", "option"] },
  { label: "Acquisition d’un nom de domaine", v: ["option", "option"] },
  { label: "Transfert d’un nom de domaine existant", v: ["option", "option"] },
  { label: "Souscription d’un hébergement", v: ["option", "option"] },
  { label: "Migration d’un hébergement existant", v: ["option", "option"] },
];

const f2 = (label: string, a: FeatureValue, b: FeatureValue): ProposalFeature => ({ label, values: [a, b] });
const fromLibrary = (labels: string[]): ProposalFeature[] =>
  FEATURE_LIBRARY.filter((x) => labels.includes(x.label)).map((x) => f2(x.label, x.v[0], x.v[1]));

export function websiteTemplate(): Proposal {
  return {
    title: "Conception web & plateforme métier", client_name: "", client_contact: "", client_email: "",
    summary: "Deux niveaux d'ambition : un site corporate de référence, ou une plateforme métier qui automatise vos processus.",
    options: [
      { name: "Option 1 — Vitrine corporate", objective: "Image de marque, crédibilité, demandes de devis", price_min: 35000000, price_max: 48000000, delay: "3 à 4 semaines" },
      { name: "Option 2 — Plateforme métier & automatisation", objective: "Productivité, suivi en temps réel, fidélisation", price_min: 110000000, price_max: 160000000, delay: "8 à 10 semaines" },
    ],
    features: FEATURE_LIBRARY.map((x) => f2(x.label, x.v[0], x.v[1])),
    milestones: [{ label: "À la signature", percent: 40 }, { label: "Validation des maquettes et recette", percent: 30 }, { label: "Mise en ligne et formation", percent: 30 }],
    status: "brouillon", accepted_option: null, valid_until: null,
  };
}

export function cloudTemplate(): Proposal {
  return {
    title: "Migration cloud & infogérance", client_name: "", client_contact: "", client_email: "",
    summary: "Deux niveaux d'accompagnement : une migration accompagnée vers le cloud, ou une migration suivie d'une infogérance complète.",
    options: [
      { name: "Option 1 — Migration accompagnée", objective: "Migrer sans interruption d'activité", price_min: 0, price_max: 0, delay: "6 à 8 semaines" },
      { name: "Option 2 — Migration + infogérance", objective: "Déléguer l'exploitation au quotidien", price_min: 0, price_max: 0, delay: "2 à 3 mois" },
    ],
    features: [
      f2("Audit de l'existant et plan de migration", "inclus", "inclus"),
      f2("Migration des données et applications", "inclus", "inclus"),
      f2("Formation des équipes", "option", "inclus"),
      f2("Supervision et sauvegardes", "non", "inclus"),
      f2("Support et astreinte", "non", "inclus"),
      f2("Sécurité et conformité", "option", "inclus"),
    ],
    milestones: [{ label: "À la signature", percent: 40 }, { label: "Fin de migration", percent: 30 }, { label: "Recette et bascule", percent: 30 }],
    status: "brouillon", accepted_option: null, valid_until: null,
  };
}

export function trainingTemplate(): Proposal {
  return {
    title: "Formation professionnelle", client_name: "", client_contact: "", client_email: "",
    summary: "Deux formats : une session inter-entreprises sur catalogue, ou une formation sur mesure dans vos locaux.",
    options: [
      { name: "Option 1 — Session inter-entreprises", objective: "Former quelques collaborateurs rapidement", price_min: 0, price_max: 0, delay: "2 semaines" },
      { name: "Option 2 — Sur mesure intra-entreprise", objective: "Un programme adapté à vos outils et processus", price_min: 0, price_max: 0, delay: "3 à 4 semaines" },
    ],
    features: [
      f2("Supports de cours et exercices", "inclus", "inclus"),
      f2("Formateur certifié", "inclus", "inclus"),
      f2("Contenu adapté à votre contexte", "non", "inclus"),
      f2("Évaluation et quiz en ligne", "inclus", "inclus"),
      f2("Certificat de réussite", "inclus", "inclus"),
      f2("Suivi post-formation", "non", "option"),
    ],
    milestones: [{ label: "À la signature", percent: 50 }, { label: "À la fin de la session", percent: 50 }],
    status: "brouillon", accepted_option: null, valid_until: null,
  };
}

export function auditTemplate(): Proposal {
  return {
    title: "Audit des licences Microsoft", client_name: "", client_contact: "", client_email: "",
    summary: "Deux niveaux : un audit ponctuel de vos licences, ou un audit suivi d'une optimisation continue.",
    options: [
      { name: "Option 1 — Audit ponctuel", objective: "Connaître votre situation et les économies possibles", price_min: 0, price_max: 0, delay: "2 semaines" },
      { name: "Option 2 — Audit + optimisation continue", objective: "Optimiser les licences en permanence", price_min: 0, price_max: 0, delay: "1 mois" },
    ],
    features: [
      f2("Inventaire des licences et usages", "inclus", "inclus"),
      f2("Rapport d'écarts et recommandations", "inclus", "inclus"),
      f2("Plan de renégociation", "option", "inclus"),
      f2("Suivi trimestriel des consommations", "non", "inclus"),
      f2("Accompagnement au renouvellement", "non", "inclus"),
    ],
    milestones: [{ label: "À la signature", percent: 50 }, { label: "Remise du rapport", percent: 50 }],
    status: "brouillon", accepted_option: null, valid_until: null,
  };
}

export function businessAppTemplate(): Proposal {
  return {
    title: "Application métier & automatisation des processus", client_name: "", client_contact: "", client_email: "",
    summary: "Deux niveaux d'ambition : une application qui digitalise un processus clé, ou une plateforme qui automatise et relie plusieurs processus métier.",
    options: [
      { name: "Option 1 — Application métier", objective: "Digitaliser un processus clé (demandes, suivi, validation)", price_min: 0, price_max: 0, delay: "8 à 10 semaines" },
      { name: "Option 2 — Plateforme intégrée & automatisée", objective: "Relier plusieurs processus, réduire les ressaisies et les délais", price_min: 0, price_max: 0, delay: "2 à 3 mois" },
    ],
    features: fromLibrary([
      "Gestion des utilisateurs et des rôles (droits par profil)",
      "Formulaires métier avec contrôles de saisie",
      "Tableaux de bord et indicateurs de suivi",
      "Notifications internes et alertes automatiques",
      "Circuit d'approbation (validation en cascade)",
      "Génération automatique de documents (PDF)",
      "Intégration avec vos logiciels (ERP, comptabilité…)",
      "Mode hors-ligne (zones à faible connexion)",
      "Journal d'audit des actions",
      "Application mobile (Android / iOS)",
      "API ouverte pour vos partenaires",
      "Hébergement, sécurité et sauvegardes",
      "Maintenance et support",
      "Formation des équipes",
    ]),
    milestones: [{ label: "À la signature", percent: 40 }, { label: "Recette de la maquette fonctionnelle", percent: 30 }, { label: "Mise en production et formation", percent: 30 }],
    status: "brouillon", accepted_option: null, valid_until: null,
  };
}

export const TEMPLATES: { key: string; label: string; build: () => Proposal }[] = [
  { key: "site", label: "Site web", build: websiteTemplate },
  { key: "metier", label: "Application métier", build: businessAppTemplate },
  { key: "cloud", label: "Migration cloud", build: cloudTemplate },
  { key: "formation", label: "Formation", build: trainingTemplate },
  { key: "audit", label: "Audit licences Microsoft", build: auditTemplate },
];

const emptyProposal = (): Proposal => ({
  title: "Proposition commerciale", client_name: "", client_contact: "", client_email: "", summary: "",
  options: [{ name: "Option 1", objective: "", price_min: 0, price_max: 0, delay: "" }, { name: "Option 2", objective: "", price_min: 0, price_max: 0, delay: "" }],
  features: [], milestones: [{ label: "À la signature", percent: 50 }, { label: "À la livraison", percent: 50 }],
  status: "brouillon", accepted_option: null, valid_until: null,
});

/** Une proposition est « vide » tant que ni client, ni résumé, ni option, ni fonctionnalité n'a été renseigné. */
export const isEmptyProposal = (p: Proposal): boolean =>
  !p.client_name.trim() &&
  !(p.summary || "").trim() &&
  p.features.length === 0 &&
  p.options.every((o) => !o.objective.trim() && !o.delay.trim() && !o.price_min && !o.price_max);

const db = supabase as any;

function ValueCell({ v }: { v: FeatureValue }) {
  if (v === "inclus") return <Check className="h-4 w-4 text-primary mx-auto" aria-label="Inclus" />;
  if (v === "option") return <span className="text-xs text-muted-foreground">En option</span>;
  return <Minus className="h-4 w-4 text-muted-foreground mx-auto" aria-label="Non inclus" />;
}

const VALUE_CHOICES: { v: FeatureValue; l: string }[] = [
  { v: "inclus", l: "Inclus" }, { v: "option", l: "Option" }, { v: "non", l: "Non" },
];

function ValuePicker({ value, onChange, label }: { value: FeatureValue; onChange: (v: FeatureValue) => void; label?: string }) {
  return (
    <div className="flex rounded-md border overflow-hidden shrink-0" role="radiogroup" aria-label={label}>
      {VALUE_CHOICES.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v}
          className={`px-2 py-1.5 text-xs transition-colors ${value === o.v ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
          onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}

function DelayPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const known = DELAYS.includes(value);
  return (
    <div className="space-y-1">
      <Select value={known ? value : "__autre"} onValueChange={(v) => onChange(v === "__autre" ? "" : v)}>
        <SelectTrigger><SelectValue placeholder="Délai" /></SelectTrigger>
        <SelectContent>
          {DELAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          <SelectItem value="__autre">Autre…</SelectItem>
        </SelectContent>
      </Select>
      {!known && <Input placeholder="Délai personnalisé" value={value} onChange={(x) => onChange(x.target.value)} />}
    </div>
  );
}

interface ClientRow { id: string; client_name: string; contact_person: string | null; email: string | null; }
interface CatalogRow { id: string; name: string; description: string | null; is_subscription: boolean; }

export default function ProposalsTab() {
  const [list, setList] = useState<Proposal[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "error">("loading");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [exporting, setExporting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [expectedByClient, setExpectedByClient] = useState(false);
  const [emailMessage, setEmailMessage] = useState("Bonjour,\n\nVoici la proposition préparée pour votre demande. Nous restons disponibles pour en discuter.\n\nBien cordialement,\nL’équipe CloudMature");
  const [sendKey, setSendKey] = useState("");
  const filtered = filterProposals(list, search, statusFilter);
  const pagination = paginateProposals(filtered, page, pageSize);

  // Brouillon sauvegardé en continu : survit à une fermeture de fenêtre, un
  // rechargement forcé ou une déconnexion automatique. Clé distincte par proposition.
  const draftKey = editing ? `proposal:${editing.id ?? "new"}` : "proposal:none";
  const draft = useFormDraft<Proposal>(draftKey, editing ?? emptyProposal(), isEmptyProposal, !!editing);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db.from("commercial_proposals").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Impossible de charger les propositions");
    setList((data as Proposal[]) || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
    db.from("service_clients").select("id, client_name, contact_person, email").order("client_name")
      .then(({ data }: { data: ClientRow[] | null }) => setClients(data || []));
    db.from("service_catalog").select("id, name, description, is_subscription").eq("active", true).order("display_order").order("name")
      .then(({ data, error }: { data: CatalogRow[] | null; error: unknown }) => {
        setCatalog(data || []);
        setCatalogState(error ? "error" : "ready");
      });
  }, []);

  const save = async (): Promise<Proposal | undefined> => {
    if (!editing) return;
    if (!editing.client_name.trim()) { toast.error("Indiquez le nom du client"); return; }
    if (milestonesTotal(editing.milestones) !== 100) { toast.error("Les jalons de paiement doivent totaliser 100 %"); return; }
    if (editing.options.some((o) => o.price_min < 0 || o.price_max < 0) || editing.milestones.some((m) => m.percent < 0)) {
      toast.error("Les montants et les pourcentages ne peuvent pas être négatifs"); return;
    }
    if (editing.options.some((o) => !isValidProposalTax(o.tax_rate))) {
      toast.error("Le taux de taxe doit être compris entre 0 et 100 %"); return;
    }
    setSaving(true);
    const { id, created_at, ...payload } = editing;
    const { data: u } = await supabase.auth.getUser();
    const res = id
      ? await db.from("commercial_proposals").update(payload).eq("id", id).select().single()
      : await db.from("commercial_proposals").insert({ ...payload, created_by: u.user?.id }).select().single();
    setSaving(false);
    if (res.error) { toast.error("Enregistrement impossible"); return; }
    toast.success("Proposition enregistrée");
    draft.clear(); // enregistré en base : le brouillon local n'a plus lieu d'exister
    setEditing(res.data as Proposal);
    load();
    return res.data as Proposal;
  };

  const exportDocument = async (p: Proposal, type: "pdf" | "docx") => {
    setExporting(true);
    try { saveAs(await (type === "pdf" ? generateProposalPdf(p) : generateProposalWord(p)), proposalFilename(p, type)); }
    catch { toast.error("Génération du document impossible"); }
    finally { setExporting(false); }
  };

  const sendProposal = async () => {
    if (!editing || !expectedByClient || sending) return;
    setSending(true);
    try {
      const saved = await save();
      if (!saved?.id) return;
      const [pdf, word] = await Promise.all([generateProposalPdf(saved), generateProposalWord(saved)]);
      const { data, error } = await supabase.functions.invoke("send-transactional-email", { body: {
        templateName: "proposal-delivery", proposalId: saved.id, expectedByClient, message: emailMessage, idempotencyKey: sendKey,
        documents: [{ extension: "pdf", base64: await blobToBase64(pdf) }, { extension: "docx", base64: await blobToBase64(word) }],
      } });
      if (error || !data?.success) throw new Error(data?.reason === "email_suppressed" ? "Ce destinataire ne peut pas recevoir ces emails." : "Envoi impossible. Vérifiez le service email et réessayez.");
      toast.success("Email placé dans la file d’envoi");
      setEmailOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Envoi impossible"); }
    finally { setSending(false); }
  };

  const remove = async (p: Proposal) => {
    if (!p.id || !confirm(`Supprimer la proposition pour ${p.client_name} ?`)) return;
    await db.from("commercial_proposals").delete().eq("id", p.id);
    load();
  };

  const duplicate = (p: Proposal) => {
    const { id, created_at, ...rest } = p;
    setEditing({ ...rest, title: `${p.title} (copie)`, status: "brouillon", accepted_option: null });
  };

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <p className="text-sm text-muted-foreground">Préparez des offres comparatives à plusieurs options, prêtes à imprimer ou envoyer en PDF.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(emptyProposal())}><Plus className="h-4 w-4 mr-1" />Vierge</Button>
            <Select onValueChange={(k) => { const template = TEMPLATES.find((t) => t.key === k); if (template) setEditing(template.build()); }}>
              <SelectTrigger className="w-56"><Sparkles className="h-4 w-4 mr-1" /><SelectValue placeholder="Partir d'un modèle…" /></SelectTrigger>
              <SelectContent>{TEMPLATES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" aria-label="Rechercher une proposition" placeholder="Client, titre, contact ou email…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}><SelectTrigger className="w-44" aria-label="Filtrer par statut"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous les statuts</SelectItem>{Object.entries(STATUSES).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}><SelectTrigger className="w-36" aria-label="Propositions par page"><SelectValue /></SelectTrigger><SelectContent>{[6, 12, 24].map((size) => <SelectItem key={size} value={String(size)}>{size} par page</SelectItem>)}</SelectContent></Select>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">{list.length ? "Aucune proposition correspondant aux filtres." : "Aucune proposition pour l'instant."}</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pagination.rows.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between gap-2">
                    <button className="text-left font-semibold hover:underline" onClick={() => setEditing(p)}>{p.client_name || "Client sans nom"}</button>
                    <Badge variant={p.status === "acceptee" ? "default" : "secondary"}>{STATUSES[p.status] || p.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.title} · {p.options.length} options</p>
                  {p.accepted_option != null && <p className="text-sm">Retenue : {p.options[p.accepted_option]?.name}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(p)}><FileText className="h-4 w-4 mr-1" />Ouvrir</Button>
                    <Button size="sm" variant="ghost" onClick={() => duplicate(p)}><Copy className="h-4 w-4 mr-1" />Dupliquer</Button>
                    <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <nav aria-label="Pagination des propositions" className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">{pagination.total} proposition(s) · Page {pagination.page} sur {pagination.pages}</span>
          <div className="flex gap-2"><Button size="icon" variant="outline" aria-label="Page précédente" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="outline" aria-label="Page suivante" disabled={pagination.page >= pagination.pages} onClick={() => setPage(pagination.page + 1)}><ChevronRight className="h-4 w-4" /></Button></div>
        </nav>
      </div>
    );
  }

  const e = editing;
  const set = (patch: Partial<Proposal>) => setEditing({ ...e, ...patch });
  const setOpt = (i: number, patch: Partial<ProposalOption>) => set({ options: e.options.map((o, j) => j === i ? { ...o, ...patch } : o) });
  const addOption = () => set({ options: [...e.options, { name: `Option ${e.options.length + 1}`, objective: "", price_min: 0, price_max: 0, delay: "" }], features: e.features.map((f) => ({ ...f, values: [...f.values, "non"] })) });
  const removeOption = (i: number) => set({ options: e.options.filter((_, j) => j !== i), features: e.features.map((f) => ({ ...f, values: f.values.filter((_, j) => j !== i) })), accepted_option: null });
  const total = milestonesTotal(e.milestones);

  const pickClient = (id: string) => {
    if (id === "__manuel") return;
    const c = clients.find((x) => x.id === id);
    if (c) set({ client_name: c.client_name, client_contact: c.contact_person || "", client_email: c.email || "" });
  };

  const applyTemplate = (key: string) => {
    const t = TEMPLATES.find((x) => x.key === key)?.build();
    if (!t) return;
    set({ title: t.title, summary: t.summary, options: t.options, features: t.features, milestones: t.milestones, accepted_option: null });
  };

  const toggleLibraryFeature = (label: string, checked: boolean) => {
    if (checked) {
      if (e.features.some((f) => f.label === label)) return;
      const lib = FEATURE_LIBRARY.find((x) => x.label === label);
      const base = lib ? lib.v : (["inclus", "inclus"] as [FeatureValue, FeatureValue]);
      set({ features: [...e.features, { label, values: e.options.map((_, i) => base[Math.min(i, 1)]) }] });
    } else {
      set({ features: e.features.filter((f) => f.label !== label) });
    }
  };

  const toggleCatalogService = (service: CatalogRow, checked: boolean) => {
    if (checked) {
      if (e.features.some((f) => f.service_id === service.id || f.label === service.name)) return;
      set({ features: [...e.features, { label: service.name, service_id: service.id, values: e.options.map(() => "option" as FeatureValue) }] });
    } else {
      set({ features: e.features.filter((f) => f.service_id !== service.id && f.label !== service.name) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center print:hidden">
        <Button variant="ghost" onClick={() => { setEditing(null); }}><ArrowLeft className="h-4 w-4 mr-1" />Propositions</Button>
        <Select onValueChange={applyTemplate}>
          <SelectTrigger className="w-48"><Sparkles className="h-4 w-4 mr-1" /><SelectValue placeholder="Appliquer un modèle" /></SelectTrigger>
          <SelectContent>{TEMPLATES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <div className="ml-auto flex flex-wrap gap-2">
          <Select value={e.status} onValueChange={(v) => set({ status: v })}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(STATUSES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Imprimer</Button>
          <Button variant="outline" disabled={exporting} onClick={() => exportDocument(e, "pdf")}><Download className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" disabled={exporting} onClick={() => exportDocument(e, "docx")}><Download className="h-4 w-4 mr-1" />Word</Button>
          <Button variant="outline" disabled={saving || sending} onClick={() => { setExpectedByClient(false); setSendKey(crypto.randomUUID()); setEmailOpen(true); }}><Mail className="h-4 w-4 mr-1" />Envoyer par email</Button>
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "…" : "Enregistrer"}</Button>
        </div>
      </div>

      <Dialog open={emailOpen} onOpenChange={(open) => { if (!sending) setEmailOpen(open); }}>
        <DialogContent><DialogHeader><DialogTitle>Envoyer la proposition</DialogTitle></DialogHeader>
          <label className="text-sm">Destinataire<Input type="email" value={e.client_email || ""} onChange={(event) => set({ client_email: event.target.value })} placeholder="Email du client" /></label>
          <label className="text-sm">Message<Textarea rows={6} value={emailMessage} onChange={(event) => setEmailMessage(event.target.value)} maxLength={3000} /></label>
          <p className="text-sm text-muted-foreground">PDF et Word accessibles par liens privés valables 7 jours. La proposition sera enregistrée avant l’envoi.</p>
          <label className="flex items-start gap-2 text-sm"><Checkbox checked={expectedByClient} onCheckedChange={(value) => setExpectedByClient(value === true)} />Le client attend cette proposition à la suite de sa demande.</label>
          <DialogFooter><Button variant="outline" disabled={sending} onClick={() => setEmailOpen(false)}>Annuler</Button><Button disabled={sending || !expectedByClient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.client_email || "")} onClick={sendProposal}><Mail className="h-4 w-4 mr-1" />{sending ? "Envoi…" : "Confirmer l’envoi"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {draft.pendingDraft && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-card p-3 print:hidden">
          <p className="flex-1 text-sm">
            Un brouillon non enregistré du {new Date(draft.pendingDraft.savedAt).toLocaleString("fr-FR")} a été retrouvé.
          </p>
          <Button size="sm" variant="outline" onClick={() => { const v = draft.restore(); if (v) setEditing(v); }}>Reprendre le brouillon</Button>
          <Button size="sm" variant="ghost" onClick={draft.discard}>Ignorer</Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 print:hidden">
        <Card>
          <CardHeader><CardTitle className="text-base">Client</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Titre de la proposition" value={e.title} onChange={(x) => set({ title: x.target.value })} />
            {clients.length > 0 && (
              <Select onValueChange={pickClient}>
                <SelectTrigger><SelectValue placeholder="Choisir un client existant…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__manuel">Saisie manuelle</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Input placeholder="Entreprise cliente *" value={e.client_name} onChange={(x) => set({ client_name: x.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Contact" value={e.client_contact || ""} onChange={(x) => set({ client_contact: x.target.value })} />
              <Input placeholder="Email" value={e.client_email || ""} onChange={(x) => set({ client_email: x.target.value })} />
            </div>
            <label className="text-sm text-muted-foreground">Valable jusqu'au</label>
            <Input type="date" value={e.valid_until || ""} onChange={(x) => set({ valid_until: x.target.value || null })} />
            <Textarea placeholder="Résumé du besoin" value={e.summary || ""} onChange={(x) => set({ summary: x.target.value })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Jalons de paiement</CardTitle>
            <span className={total === 100 ? "text-sm text-primary" : "text-sm text-destructive"}>Total {total} %</span></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {MILESTONE_PRESETS.map((p) => (
                <Button key={p.label} size="sm" variant="outline" onClick={() => set({ milestones: p.milestones.map((m) => ({ ...m })) })}>{p.label}</Button>
              ))}
            </div>
            {e.milestones.map((m, i) => (
              <div key={i} className="flex gap-2">
                <Input value={m.label} onChange={(x) => set({ milestones: e.milestones.map((y, j) => j === i ? { ...y, label: x.target.value } : y) })} />
                <NonNegativeInput type="number" className="w-24" value={m.percent} onChange={(n) => set({ milestones: e.milestones.map((y, j) => j === i ? { ...y, percent: n } : y) })} />
                <Button size="icon" variant="ghost" onClick={() => set({ milestones: e.milestones.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => set({ milestones: [...e.milestones, { label: "", percent: 0 }] })}><Plus className="h-4 w-4 mr-1" />Jalon</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="print:hidden">
        <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Options</CardTitle>
          <Button size="sm" variant="outline" onClick={addOption} disabled={e.options.length >= 4}><Plus className="h-4 w-4 mr-1" />Option</Button></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {e.options.map((o, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-3">
              <Input value={o.name} onChange={(x) => setOpt(i, { name: x.target.value })} />
              <Input placeholder="Objectif" value={o.objective} onChange={(x) => setOpt(i, { objective: x.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <NonNegativeInput aria-label={`Prix minimum HT option ${i + 1}`} placeholder="Prix min HT GNF" value={o.price_min} onChange={(n) => setOpt(i, { price_min: n })} />
                <NonNegativeInput aria-label={`Prix maximum HT option ${i + 1}`} placeholder="Prix max HT GNF" value={o.price_max} onChange={(n) => setOpt(i, { price_max: n })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox aria-label={`Appliquer une taxe option ${i + 1}`} checked={o.tax_rate !== undefined} onCheckedChange={(checked) => setOpt(i, { tax_rate: checked === true ? 0 : undefined })} />
                Appliquer une taxe
              </label>
              {o.tax_rate !== undefined && (
                <div className="space-y-2">
                  <label className="text-sm" htmlFor={`tax-${i}`}>Taux de taxe (%)</label>
                  <NonNegativeInput id={`tax-${i}`} max={100} step="0.01" placeholder="Taux à confirmer" value={o.tax_rate} onChange={(n) => setOpt(i, { tax_rate: Math.min(100, n) })} />
                  <p className="text-sm tabular-nums font-medium">TTC : {formatGnf(calculateProposalTax(o.price_min, o.tax_rate).total)}{o.price_max > o.price_min ? ` – ${formatGnf(calculateProposalTax(o.price_max, o.tax_rate).total)}` : ""}</p>
                </div>
              )}
              <DelayPicker value={o.delay} onChange={(v) => setOpt(i, { delay: v })} />
              <div className="flex gap-2">
                <Button size="sm" variant={e.accepted_option === i ? "default" : "outline"} onClick={() => set({ accepted_option: e.accepted_option === i ? null : i, status: e.accepted_option === i ? e.status : "acceptee" })}>
                  <Check className="h-4 w-4 mr-1" />{e.accepted_option === i ? "Retenue" : "Retenue par le client"}</Button>
                {e.options.length > 1 && <Button size="icon" variant="ghost" onClick={() => removeOption(i)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Fonctionnalités comparées</CardTitle>
          <Button size="sm" variant="outline" onClick={() => set({ features: [...e.features, { label: "", values: e.options.map(() => "inclus" as FeatureValue) }] })}><Plus className="h-4 w-4 mr-1" />Ligne personnalisée</Button></CardHeader>
        <CardContent className="space-y-3">
          <details className="rounded-lg border p-3">
            <summary className="text-sm font-medium cursor-pointer">Bibliothèque de fonctionnalités — cochez pour ajouter</summary>
            <div className="grid gap-2 md:grid-cols-2 mt-3">
              {FEATURE_LIBRARY.map((lib) => {
                const checked = e.features.some((f) => f.label === lib.label);
                return (
                  <label key={lib.label} className="flex items-start gap-2 text-sm cursor-pointer">
                    <Checkbox checked={checked} onCheckedChange={(c) => toggleLibraryFeature(lib.label, c === true)} className="mt-0.5" />
                    <span>{lib.label}</span>
                  </label>
                );
              })}
            </div>
          </details>
          <details className="rounded-lg border p-3">
            <summary className="text-sm font-medium cursor-pointer">Services du catalogue</summary>
            <div className="mt-3 space-y-3">
              <Input aria-label="Rechercher un service" placeholder="Rechercher un service…" value={catalogSearch} onChange={(x) => setCatalogSearch(x.target.value)} />
              {catalogState === "loading" ? <p className="text-sm text-muted-foreground">Chargement du catalogue…</p> : catalogState === "error" ? <p className="text-sm text-destructive">Catalogue indisponible. Réessayez en rouvrant la page.</p> : (
                <div className="grid gap-3 md:grid-cols-2 max-h-72 overflow-y-auto">
                  {catalog.filter((s) => `${s.name} ${s.description || ""}`.toLocaleLowerCase("fr").includes(catalogSearch.toLocaleLowerCase("fr"))).map((s) => (
                    <label key={s.id} className="flex items-start gap-2 text-sm cursor-pointer">
                      <Checkbox className="mt-0.5" checked={e.features.some((f) => f.service_id === s.id || f.label === s.name)} onCheckedChange={(c) => toggleCatalogService(s, c === true)} />
                      <span><span className="font-medium">{s.name}</span>{s.is_subscription && <Badge variant="secondary" className="ml-2">Abonnement</Badge>}{s.description && <span className="block text-xs text-muted-foreground line-clamp-2">{s.description}</span>}</span>
                    </label>
                  ))}
                  {!catalog.some((s) => `${s.name} ${s.description || ""}`.toLocaleLowerCase("fr").includes(catalogSearch.toLocaleLowerCase("fr"))) && <p className="text-sm text-muted-foreground">{catalog.length ? "Aucun service correspondant." : "Aucun service actif dans le catalogue."}</p>}
                </div>
              )}
            </div>
          </details>
          {e.features.map((f, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center">
              <Input className="flex-1 min-w-[220px]" value={f.label} onChange={(x) => set({ features: e.features.map((y, j) => j === i ? { ...y, label: x.target.value } : y) })} />
              {f.values.map((v, k) => (
                <ValuePicker key={k} value={v} label={e.options[k]?.name}
                  onChange={(nv) => set({ features: e.features.map((y, j) => j === i ? { ...y, values: y.values.map((z, q) => q === k ? nv : z) } : y) })} />
              ))}
              <Button size="icon" variant="ghost" onClick={() => set({ features: e.features.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Aperçu imprimable */}
      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-6 space-y-5">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">CloudMature</p>
              <h2 className="text-xl font-bold">{e.title}</h2>
              <p className="text-sm">Pour : <strong>{e.client_name || "—"}</strong>{e.client_contact ? ` · ${e.client_contact}` : ""}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Date : {new Date(e.created_at || Date.now()).toLocaleDateString("fr-FR")}</p>
              {e.valid_until && <p>Valable jusqu'au {new Date(e.valid_until).toLocaleDateString("fr-FR")}</p>}
            </div>
          </div>
          {e.summary && <p className="text-sm">{e.summary}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Fonctionnalité</th>
                  {e.options.map((o, i) => <th key={i} className={`p-2 text-center ${e.accepted_option === i ? "bg-primary/10" : ""}`}>{o.name}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b"><td className="p-2 text-muted-foreground">Objectif</td>{e.options.map((o, i) => <td key={i} className="p-2 text-center">{o.objective || "—"}</td>)}</tr>
                {e.features.map((f, i) => (
                  <tr key={i} className="border-b"><td className="p-2">{f.label}</td>{f.values.map((v, k) => <td key={k} className="p-2 text-center"><ValueCell v={v} /></td>)}</tr>
                ))}
                <tr className="border-b"><td className="p-2 font-medium">Délai</td>{e.options.map((o, i) => <td key={i} className="p-2 text-center">{o.delay || "—"}</td>)}</tr>
                <tr><td className="p-2 font-medium">Budget HT</td>{e.options.map((o, i) => (
                  <td key={i} className="p-2 text-center font-semibold tabular-nums">{o.price_max > o.price_min ? `${formatGnf(o.price_min)} – ${formatGnf(o.price_max)}` : formatGnf(o.price_min)}</td>
                ))}</tr>
                <tr className="border-b"><td className="p-2 font-medium">Taxe</td>{e.options.map((o, i) => (
                  <td key={i} className="p-2 text-center tabular-nums">{o.tax_rate === undefined ? "Non appliquée" : `${o.tax_rate} % · ${formatGnf(calculateProposalTax(o.price_min, o.tax_rate).tax)}${o.price_max > o.price_min ? ` – ${formatGnf(calculateProposalTax(o.price_max, o.tax_rate).tax)}` : ""}`}</td>
                ))}</tr>
                <tr><td className="p-2 font-medium">Budget TTC</td>{e.options.map((o, i) => (
                  <td key={i} className="p-2 text-center font-semibold tabular-nums">{formatGnf(calculateProposalTax(o.price_min, o.tax_rate).total)}{o.price_max > o.price_min ? ` – ${formatGnf(calculateProposalTax(o.price_max, o.tax_rate).total)}` : ""}</td>
                ))}</tr>
              </tbody>
            </table>
          </div>
          {e.milestones.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-1">Modalités de paiement</h3>
              <ul className="text-sm list-disc pl-5">{e.milestones.map((m, i) => <li key={i}>{m.percent} % — {m.label}</li>)}</ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Montants indicatifs, ajustés après cadrage détaillé. Bon pour accord : ____________________</p>
        </CardContent>
      </Card>
    </div>
  );
}
