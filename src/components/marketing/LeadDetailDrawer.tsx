import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SendDirectEmailDialog from "@/components/admin/SendDirectEmailDialog";
import {
  ACTIVITY_TYPES, LEAD_STATUSES, formatDateTime, priorityMeta, statusLabel, whatsappLink,
  type Lead, type LeadActivity, type LeadStatus,
} from "./marketing-shared";
import { cn } from "@/lib/utils";
import { CalendarClock, Loader2, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";

interface ScoreLine { label: string; points: number }

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesUsers: { user_id: string; full_name: string | null }[];
  onUpdated: (lead: Lead) => void;
}

export function LeadDetailDrawer({ lead, open, onOpenChange, salesUsers, onUpdated }: Props) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  useEffect(() => {
    if (!open || !lead) return;
    setNote("");
    (async () => {
      const { data } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });
      setActivities((data as LeadActivity[]) ?? []);
    })();
  }, [open, lead?.id]);

  const breakdown = useMemo<ScoreLine[]>(() => {
    const raw = lead?.score_breakdown;
    return Array.isArray(raw) ? (raw as unknown as ScoreLine[]) : [];
  }, [lead?.score_breakdown]);

  if (!lead) return null;

  const patch = async (changes: Partial<Lead>, activity?: { type: LeadActivity["type"]; content: string }) => {
    setSaving(true);
    const { data, error } = await supabase
      .from("marketing_leads")
      .update(changes)
      .eq("id", lead.id)
      .select("*")
      .single();
    if (error || !data) {
      setSaving(false);
      toast.error("Mise à jour impossible");
      return;
    }
    if (activity) {
      const { data: userData } = await supabase.auth.getUser();
      const { data: act } = await supabase
        .from("lead_activities")
        .insert({ lead_id: lead.id, user_id: userData.user?.id ?? null, ...activity })
        .select("*")
        .single();
      if (act) setActivities((prev) => [act as LeadActivity, ...prev]);
    }
    setSaving(false);
    onUpdated(data as Lead);
    toast.success("Prospect mis à jour");
  };

  const addNote = async () => {
    const content = note.trim();
    if (!content) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("lead_activities")
      .insert({ lead_id: lead.id, user_id: userData.user?.id ?? null, type: "note", content })
      .select("*")
      .single();
    setSaving(false);
    if (error || !data) { toast.error("Note non enregistrée"); return; }
    setActivities((prev) => [data as LeadActivity, ...prev]);
    setNote("");
    toast.success("Note ajoutée");
  };

  const pMeta = priorityMeta(lead.priority);
  const wa = whatsappLink(lead.phone);

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-2 last:border-0 sm:flex-row sm:items-start sm:gap-4">
      <span className="w-52 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("border", pMeta.className)}>{pMeta.label}</Badge>
              <Badge variant="secondary">Score {lead.score}</Badge>
              <Badge variant="outline">{statusLabel(lead.status)}</Badge>
            </div>
            <SheetTitle className="text-xl">{lead.company_name}</SheetTitle>
            <SheetDescription>
              {lead.full_name}{lead.job_title ? ` · ${lead.job_title}` : ""}
            </SheetDescription>
          </SheetHeader>

          {/* Quick actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {lead.phone && (
              <Button asChild variant="outline" size="sm">
                <a href={`tel:${lead.phone.replace(/\s/g, "")}`}><Phone className="mr-2 h-4 w-4" /> Appeler</a>
              </Button>
            )}
            {wa && (
              <Button asChild variant="outline" size="sm">
                <a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
              <Mail className="mr-2 h-4 w-4" /> E-mail
            </Button>
          </div>

          {/* Pipeline controls */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Statut</Label>
              <Select
                value={lead.status}
                onValueChange={(v) =>
                  patch({ status: v as LeadStatus }, {
                    type: "changement_statut",
                    content: `Statut : ${statusLabel(lead.status)} → ${statusLabel(v)}`,
                  })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Commercial assigné</Label>
              <Select
                value={lead.assigned_to ?? "none"}
                onValueChange={(v) => patch({ assigned_to: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assigné</SelectItem>
                  {salesUsers.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.user_id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prochaine action</Label>
              <Input
                type="datetime-local"
                value={lead.next_action_at ? new Date(lead.next_action_at).toISOString().slice(0, 16) : ""}
                onChange={(e) =>
                  patch({ next_action_at: e.target.value ? new Date(e.target.value).toISOString() : null })
                }
              />
            </div>
            {(lead.status === "perdu" || lead.status === "sans_suite") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Motif de perte</Label>
                <Input
                  defaultValue={lead.lost_reason ?? ""}
                  onBlur={(e) => e.target.value !== (lead.lost_reason ?? "") && patch({ lost_reason: e.target.value || null })}
                  placeholder="Budget, concurrent, sans réponse…"
                />
              </div>
            )}
          </div>

          <Separator className="my-5" />

          {/* Full answers */}
          <section>
            <h3 className="mb-2 text-sm font-bold text-foreground">Réponses du formulaire</h3>
            <Row label="Entreprise" value={lead.company_name} />
            <Row label="Secteur" value={lead.sector} />
            <Row label="Ville" value={lead.city} />
            <Row label="Employés" value={lead.employee_count_range} />
            <Row label="Utilise Microsoft" value={lead.uses_microsoft} />
            <Row label="Produits Microsoft" value={lead.microsoft_products?.join(", ")} />
            <Row label="Utilisateurs à couvrir" value={lead.users_to_cover} />
            <Row label="Échéance de renouvellement" value={lead.renewal_timeline} />
            <Row label="Fournisseur actuel" value={lead.has_current_provider} />
            <Row label="Besoins principaux" value={lead.main_needs?.join(", ")} />
            <Row label="Informations complémentaires" value={lead.additional_info} />
            <Row label="Contact" value={`${lead.full_name}${lead.job_title ? ` — ${lead.job_title}` : ""}`} />
            <Row label="E-mail" value={lead.email} />
            <Row label="Téléphone" value={lead.phone} />
            <Row label="Contact préféré" value={lead.preferred_contact_method} />
            <Row label="Disponibilité" value={
              lead.contact_timing + (lead.preferred_datetime ? ` — ${formatDateTime(lead.preferred_datetime)}` : "")
            } />
            <Row label="Source" value={lead.source} />
            <Row label="UTM" value={[lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" / ")} />
            <Row label="Reçu le" value={formatDateTime(lead.created_at)} />
          </section>

          <Separator className="my-5" />

          {/* Score detail */}
          <section>
            <h3 className="mb-2 text-sm font-bold text-foreground">Détail du score ({lead.score} points)</h3>
            {breakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun point attribué.</p>
            ) : (
              <ul className="space-y-1.5">
                {breakdown.map((line, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <span>{line.label}</span>
                    <span className="font-semibold text-primary">+{line.points}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Separator className="my-5" />

          {/* Consent */}
          <section className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> Consentement
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              {lead.consent_given ? "Accordé" : "Non accordé"} le {formatDateTime(lead.consent_timestamp)}
              {lead.consent_ip ? ` · IP ${lead.consent_ip}` : ""}
            </p>
            {lead.consent_text && (
              <p className="mt-2 text-xs leading-relaxed text-foreground/80">« {lead.consent_text} »</p>
            )}
          </section>

          <Separator className="my-5" />

          {/* Activities */}
          <section className="pb-8">
            <h3 className="mb-2 text-sm font-bold text-foreground">Historique</h3>
            <div className="flex gap-2">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ajouter une note rapide…"
                rows={2}
                className="flex-1"
              />
              <Button onClick={addNote} disabled={saving || !note.trim()} className="self-end">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
              </Button>
            </div>
            <ul className="mt-4 space-y-3">
              {activities.length === 0 && (
                <li className="text-sm text-muted-foreground">Aucune activité enregistrée.</li>
              )}
              {activities.map((a) => (
                <li key={a.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-[11px]">
                      {ACTIVITY_TYPES.find((t) => t.value === a.type)?.label ?? a.type}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="h-3 w-3" /> {formatDateTime(a.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{a.content}</p>
                </li>
              ))}
            </ul>
          </section>
        </SheetContent>
      </Sheet>

      <SendDirectEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        recipientEmail={lead.email}
        recipientName={lead.full_name}
      />
    </>
  );
}
