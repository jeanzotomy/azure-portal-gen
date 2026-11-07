import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Copy, FileText, Minus, Plus, Printer, Save, Trash2, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

export type FeatureValue = "inclus" | "non" | "option";
export interface ProposalOption { name: string; objective: string; price_min: number; price_max: number; delay: string; }
export interface ProposalFeature { label: string; values: FeatureValue[]; }
export interface ProposalMilestone { label: string; percent: number; }
export interface Proposal {
  id?: string; title: string; client_name: string; client_contact: string | null; client_email: string | null;
  summary: string | null; options: ProposalOption[]; features: ProposalFeature[]; milestones: ProposalMilestone[];
  status: string; accepted_option: number | null; valid_until: string | null; created_at?: string;
}

const STATUSES: Record<string, string> = { brouillon: "Brouillon", envoyee: "Envoyée", acceptee: "Acceptée", refusee: "Refusée" };

export const formatGnf = (n: number) => `${Math.round(n || 0).toLocaleString("fr-FR").replace(/\s/g, " ")} GNF`;
export const milestonesTotal = (m: ProposalMilestone[]) => m.reduce((s, x) => s + (Number(x.percent) || 0), 0);

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

export const TEMPLATES: { key: string; label: string; build: () => Proposal }[] = [
  { key: "site", label: "Site web", build: websiteTemplate },
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

export default function ProposalsTab() {
  const [list, setList] = useState<Proposal[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.client_name.trim()) return toast.error("Indiquez le nom du client");
    if (milestonesTotal(editing.milestones) !== 100) return toast.error("Les jalons de paiement doivent totaliser 100 %");
    setSaving(true);
    const { id, created_at, ...payload } = editing;
    const { data: u } = await supabase.auth.getUser();
    const res = id
      ? await db.from("commercial_proposals").update(payload).eq("id", id).select().single()
      : await db.from("commercial_proposals").insert({ ...payload, created_by: u.user?.id }).select().single();
    setSaving(false);
    if (res.error) return toast.error("Enregistrement impossible");
    toast.success("Proposition enregistrée");
    setEditing(res.data as Proposal);
    load();
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
            <Select onValueChange={(k) => setEditing(TEMPLATES.find((t) => t.key === k)!.build())}>
              <SelectTrigger className="w-56"><Sparkles className="h-4 w-4 mr-1" /><SelectValue placeholder="Partir d'un modèle…" /></SelectTrigger>
              <SelectContent>{TEMPLATES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : list.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Aucune proposition pour l'instant. Commencez avec un modèle.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((p) => (
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center print:hidden">
        <Button variant="ghost" onClick={() => { setEditing(null); }}><ArrowLeft className="h-4 w-4 mr-1" />Propositions</Button>
        <Select onValueChange={applyTemplate}>
          <SelectTrigger className="w-48"><Sparkles className="h-4 w-4 mr-1" /><SelectValue placeholder="Appliquer un modèle" /></SelectTrigger>
          <SelectContent>{TEMPLATES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Select value={e.status} onValueChange={(v) => set({ status: v })}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(STATUSES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Imprimer / PDF</Button>
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "…" : "Enregistrer"}</Button>
        </div>
      </div>

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
                <Input type="number" className="w-24" value={m.percent} onChange={(x) => set({ milestones: e.milestones.map((y, j) => j === i ? { ...y, percent: Number(x.target.value) } : y) })} />
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
                <Input type="number" placeholder="Prix min GNF" value={o.price_min} onChange={(x) => setOpt(i, { price_min: Number(x.target.value) })} />
                <Input type="number" placeholder="Prix max GNF" value={o.price_max} onChange={(x) => setOpt(i, { price_max: Number(x.target.value) })} />
              </div>
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
                <tr><td className="p-2 font-medium">Budget</td>{e.options.map((o, i) => (
                  <td key={i} className="p-2 text-center font-semibold tabular-nums">{o.price_max > o.price_min ? `${formatGnf(o.price_min)} – ${formatGnf(o.price_max)}` : formatGnf(o.price_min)}</td>
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
