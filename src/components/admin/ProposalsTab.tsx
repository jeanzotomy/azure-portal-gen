import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export const formatGnf = (n: number) => `${Math.round(n || 0).toLocaleString("fr-FR").replace(/\s/g, "\u202F")}\u202FGNF`;
export const milestonesTotal = (m: ProposalMilestone[]) => m.reduce((s, x) => s + (Number(x.percent) || 0), 0);

export function websiteTemplate(): Proposal {
  const f = (label: string, a: FeatureValue, b: FeatureValue): ProposalFeature => ({ label, values: [a, b] });
  return {
    title: "Conception web & plateforme métier", client_name: "", client_contact: "", client_email: "",
    summary: "Deux niveaux d'ambition : un site corporate de référence, ou une plateforme métier qui automatise vos processus.",
    options: [
      { name: "Option 1 — Vitrine corporate", objective: "Image de marque, crédibilité, demandes de devis", price_min: 35000000, price_max: 48000000, delay: "3 à 4 semaines" },
      { name: "Option 2 — Plateforme métier & automatisation", objective: "Productivité, suivi en temps réel, fidélisation", price_min: 110000000, price_max: 160000000, delay: "8 à 10 semaines" },
    ],
    features: [
      f("Design sur mesure (mobile, tablette, ordinateur)", "inclus", "inclus"),
      f("Pages institutionnelles (accueil, services, flotte, références, carrières)", "inclus", "inclus"),
      f("Français / anglais", "inclus", "inclus"),
      f("Section qualité, sécurité, environnement", "inclus", "inclus"),
      f("Formulaire de demande de devis", "inclus", "inclus"),
      f("Espace client sécurisé", "non", "inclus"),
      f("Suivi des dossiers / expéditions", "non", "inclus"),
      f("Documents PDF automatiques (bordereaux, factures)", "non", "inclus"),
      f("Alertes SMS / WhatsApp / email", "non", "inclus"),
      f("Connexion aux logiciels existants (Sage, Microsoft 365…)", "non", "option"),
      f("Hébergement, sécurité et sauvegardes", "inclus", "inclus"),
      f("Maintenance et support", "option", "option"),
    ],
    milestones: [{ label: "À la signature", percent: 40 }, { label: "Validation des maquettes et recette", percent: 30 }, { label: "Mise en ligne et formation", percent: 30 }],
    status: "brouillon", accepted_option: null, valid_until: null,
  };
}

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

export default function ProposalsTab() {
  const [list, setList] = useState<Proposal[]>([]);
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
  useEffect(() => { load(); }, []);

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
            <Button onClick={() => setEditing(websiteTemplate())}><Sparkles className="h-4 w-4 mr-1" />Modèle site web</Button>
          </div>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : list.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Aucune proposition pour l'instant. Commencez avec le modèle « site web ».</CardContent></Card>
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
  const addOption = () => set({ options: [...e.options, { name: `Option ${e.options.length + 1}`, objective: "", price_min: 0, price_max: 0, delay: "" }], features: e.features.map(f => ({ ...f, values: [...f.values, "non"] })) });
  const removeOption = (i: number) => set({ options: e.options.filter((_, j) => j !== i), features: e.features.map(f => ({ ...f, values: f.values.filter((_, j) => j !== i) })), accepted_option: null });
  const total = milestonesTotal(e.milestones);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center print:hidden">
        <Button variant="ghost" onClick={() => { setEditing(null); }}><ArrowLeft className="h-4 w-4 mr-1" />Propositions</Button>
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
              <Input placeholder="Délai" value={o.delay} onChange={(x) => setOpt(i, { delay: x.target.value })} />
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
          <Button size="sm" variant="outline" onClick={() => set({ features: [...e.features, { label: "", values: e.options.map(() => "inclus" as FeatureValue) }] })}><Plus className="h-4 w-4 mr-1" />Ligne</Button></CardHeader>
        <CardContent className="space-y-2">
          {e.features.map((f, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center">
              <Input className="flex-1 min-w-[220px]" value={f.label} onChange={(x) => set({ features: e.features.map((y, j) => j === i ? { ...y, label: x.target.value } : y) })} />
              {f.values.map((v, k) => (
                <Select key={k} value={v} onValueChange={(nv) => set({ features: e.features.map((y, j) => j === i ? { ...y, values: y.values.map((z, q) => q === k ? nv as FeatureValue : z) } : y) })}>
                  <SelectTrigger className="w-32" aria-label={e.options[k]?.name}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="inclus">Inclus</SelectItem><SelectItem value="option">En option</SelectItem><SelectItem value="non">Non inclus</SelectItem></SelectContent>
                </Select>
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
