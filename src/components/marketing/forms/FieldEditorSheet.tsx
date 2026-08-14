import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FIELD_TYPES, LEAD_MAPPABLE_COLUMNS, fieldTypeMeta, hasOptions, isAnswerable,
  parseOptions, parseVisibleWhen, slugifyKey,
  type FieldType, type VisibilityOperator,
} from "@/lib/marketing-forms";
import type { DraftField } from "./types";
import { Info } from "lucide-react";

const VISIBILITY_OPERATORS: { value: VisibilityOperator; label: string }[] = [
  { value: "est", label: "est exactement" },
  { value: "nest_pas", label: "n'est pas" },
  { value: "contient", label: "contient" },
  { value: "est_rempli", label: "est renseigné" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: DraftField | null;
  /** Champs précédents, seuls candidats possibles pour une condition d'affichage. */
  previousFields: DraftField[];
  usedKeys: string[];
  onSave: (field: DraftField) => void;
}

export function FieldEditorSheet({ open, onOpenChange, field, previousFields, usedKeys, onSave }: Props) {
  const [draft, setDraft] = useState<DraftField | null>(field);
  const [optionsText, setOptionsText] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(field);
    setOptionsText(field ? parseOptions(field.options).join("\n") : "");
    setKeyTouched(Boolean(field?.field_key));
    setError(null);
  }, [field]);

  if (!draft) return null;

  const set = (patch: Partial<DraftField>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const meta = fieldTypeMeta(draft.type);
  const condition = parseVisibleWhen(draft.visible_when);
  const conditionSource = previousFields.find((f) => f.field_key === condition?.field_key) ?? null;

  const setCondition = (patch: Partial<NonNullable<ReturnType<typeof parseVisibleWhen>>> | null) => {
    if (patch === null) { set({ visible_when: null }); return; }
    const base = condition ?? { field_key: "", operator: "est" as VisibilityOperator, values: [] };
    set({ visible_when: { ...base, ...patch } as unknown as DraftField["visible_when"] });
  };

  const submit = () => {
    const label = draft.label.trim();
    if (!label) { setError("Le libellé de la question est obligatoire."); return; }
    const key = (keyTouched && draft.field_key ? draft.field_key : slugifyKey(label)).trim();
    if (usedKeys.filter((k) => k !== field?.field_key).includes(key)) {
      setError("Cette clé technique est déjà utilisée par un autre champ.");
      return;
    }
    const options = hasOptions(draft.type)
      ? optionsText.split("\n").map((o) => o.trim()).filter(Boolean)
      : [];
    if (hasOptions(draft.type) && options.length < 2) {
      setError("Indiquez au moins deux options, une par ligne.");
      return;
    }
    if (condition && condition.operator !== "est_rempli" && condition.field_key && condition.values.length === 0) {
      setError("Choisissez au moins une réponse déclenchant l'affichage de ce champ.");
      return;
    }
    onSave({
      ...draft,
      label,
      field_key: key,
      section: draft.section?.trim() || null,
      options: options as unknown as DraftField["options"],
      visible_when: condition?.field_key ? draft.visible_when : null,
      required: isAnswerable(draft.type) ? draft.required : false,
      maps_to: isAnswerable(draft.type) ? draft.maps_to : null,
    });
    onOpenChange(false);
  };

  const conditionOptions = conditionSource ? parseOptions(conditionSource.options) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Modifier le champ</SheetTitle>
          <SheetDescription>
            Ce que le visiteur verra, et ce que la réponse alimente dans la fiche prospect.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label>Type de champ</Label>
            <Select value={draft.type} onValueChange={(v: FieldType) => set({ type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Exemple : {meta.example}</p>
          </div>

          <div className="space-y-2">
            <Label>{isAnswerable(draft.type) ? "Question posée" : "Titre affiché"}</Label>
            <Input
              value={draft.label}
              onChange={(e) => {
                const label = e.target.value;
                set({ label, ...(keyTouched ? {} : { field_key: slugifyKey(label) }) });
              }}
              placeholder="Quand vos licences doivent-elles être renouvelées ?"
            />
          </div>

          <div className="space-y-2">
            <Label>Texte d'aide</Label>
            <Textarea
              value={draft.help_text ?? ""}
              onChange={(e) => set({ help_text: e.target.value || null })}
              rows={2}
              placeholder="Plusieurs réponses possibles."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Section</Label>
              <Input
                value={draft.section ?? ""}
                onChange={(e) => set({ section: e.target.value })}
                placeholder="Entreprise"
              />
            </div>
            <div className="space-y-2">
              <Label>Clé technique</Label>
              <Input
                value={draft.field_key}
                onChange={(e) => { setKeyTouched(true); set({ field_key: slugifyKey(e.target.value) }); }}
                className="font-mono text-sm"
              />
            </div>
          </div>

          {isAnswerable(draft.type) && (
            <>
              <div className="space-y-2">
                <Label>Texte d'exemple dans le champ</Label>
                <Input
                  value={draft.placeholder ?? ""}
                  onChange={(e) => set({ placeholder: e.target.value || null })}
                  placeholder="prenom.nom@entreprise.com"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Réponse obligatoire</p>
                  <p className="text-xs text-muted-foreground">Le visiteur ne peut pas continuer sans répondre.</p>
                </div>
                <Switch checked={draft.required} onCheckedChange={(v) => set({ required: v })} />
              </div>
            </>
          )}

          {hasOptions(draft.type) && (
            <div className="space-y-2">
              <Label>Options proposées</Label>
              <Textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={6}
                placeholder={"Oui\nNon\nJe ne sais pas"}
              />
              <p className="text-xs text-muted-foreground">Une option par ligne.</p>
            </div>
          )}

          {draft.type === "choix_multiple" && (
            <div className="space-y-2">
              <Label>Nombre maximum de réponses</Label>
              <Input
                type="number" min={1}
                value={draft.max_selections ?? ""}
                onChange={(e) => set({ max_selections: e.target.value ? Number(e.target.value) : null })}
                placeholder="Sans limite"
              />
            </div>
          )}

          {(draft.type === "nombre" || draft.type === "echelle") && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Valeur minimale</Label>
                <Input type="number" value={draft.min_value ?? ""}
                  onChange={(e) => set({ min_value: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="space-y-2">
                <Label>Valeur maximale</Label>
                <Input type="number" value={draft.max_value ?? ""}
                  onChange={(e) => set({ max_value: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
          )}

          {isAnswerable(draft.type) && (
            <div className="space-y-2">
              <Label>Alimente la fiche prospect</Label>
              <Select
                value={draft.maps_to ?? "aucun"}
                onValueChange={(v) => set({ maps_to: v === "aucun" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">Aucune correspondance (réponse libre)</SelectItem>
                  {LEAD_MAPPABLE_COLUMNS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                Les réponses sans correspondance restent visibles dans le détail du prospect.
              </p>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Affichage conditionnel</p>
                <p className="text-xs text-muted-foreground">N'afficher ce champ que selon une réponse précédente.</p>
              </div>
              <Switch
                checked={Boolean(condition)}
                disabled={previousFields.length === 0}
                onCheckedChange={(v) => setCondition(v ? { field_key: "", operator: "est", values: [] } : null)}
              />
            </div>

            {condition && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="space-y-2">
                  <Label>Champ observé</Label>
                  <Select
                    value={condition.field_key || undefined}
                    onValueChange={(v) => setCondition({ field_key: v, values: [] })}
                  >
                    <SelectTrigger><SelectValue placeholder="Choisir un champ précédent" /></SelectTrigger>
                    <SelectContent>
                      {previousFields.filter((f) => isAnswerable(f.type)).map((f) => (
                        <SelectItem key={f.id} value={f.field_key}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select
                    value={condition.operator}
                    onValueChange={(v: VisibilityOperator) => setCondition({ operator: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VISIBILITY_OPERATORS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {condition.operator !== "est_rempli" && (
                  <div className="space-y-2">
                    <Label>Réponses déclenchantes</Label>
                    {conditionOptions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {conditionOptions.map((o) => {
                          const active = condition.values.includes(o);
                          return (
                            <Button
                              key={o} type="button" size="sm"
                              variant={active ? "default" : "outline"}
                              onClick={() => setCondition({
                                values: active
                                  ? condition.values.filter((v) => v !== o)
                                  : [...condition.values, o],
                              })}
                            >
                              {o}
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <Input
                        value={condition.values.join(", ")}
                        onChange={(e) => setCondition({
                          values: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                        })}
                        placeholder="Séparez les valeurs par une virgule"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pb-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={submit}>Valider le champ</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
