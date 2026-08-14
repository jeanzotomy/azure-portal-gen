import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FormFieldInput } from "@/components/marketing/FormFieldInput";
import {
  PRIORITY_LABELS, computeScore, getVisibleFields, isAnswerable, parseOptions,
  priorityFor, type Answers, type AnswerValue, type MarketingFormField,
  type MarketingFormScoringRule, type ScoringOperator,
} from "@/lib/marketing-forms";
import { newId, type DraftField, type DraftRule } from "./types";
import { Plus, Trash2, Wand2 } from "lucide-react";

const OPERATORS: { value: ScoringOperator; label: string; needsValues: boolean }[] = [
  { value: "est", label: "la réponse est l'une de", needsValues: true },
  { value: "contient", label: "la réponse contient l'une de", needsValues: true },
  { value: "superieur_a", label: "la réponse est supérieure à", needsValues: true },
  { value: "est_rempli", label: "la réponse est renseignée", needsValues: false },
];

interface Props {
  formId: string;
  fields: DraftField[];
  rules: DraftRule[];
  urgentThreshold: number;
  qualifiedThreshold: number;
  onRulesChange: (rules: DraftRule[]) => void;
  onThresholdsChange: (urgent: number, qualified: number) => void;
}

export function ScoringBuilder({
  formId, fields, rules, urgentThreshold, qualifiedThreshold,
  onRulesChange, onThresholdsChange,
}: Props) {
  const [answers, setAnswers] = useState<Answers>({});
  const [dial, setDial] = useState("+224");
  const answerable = fields.filter((f) => isAnswerable(f.type));

  const asRows = useMemo(
    () => rules.map((r) => ({ ...r, valueList: Array.isArray(r.value) ? (r.value as string[]) : [] })),
    [rules],
  );

  const maxScore = useMemo(
    () => rules.reduce((sum, r) => sum + Math.max(0, r.points), 0),
    [rules],
  );

  const simulation = useMemo(
    () => computeScore(rules as unknown as MarketingFormScoringRule[], answers),
    [rules, answers],
  );
  const priority = priorityFor(simulation.score, urgentThreshold, qualifiedThreshold);

  const update = (id: string, patch: Partial<DraftRule>) =>
    onRulesChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRule = () => {
    const first = answerable[0];
    onRulesChange([...rules, {
      id: newId(), form_id: formId,
      field_key: first?.field_key ?? "",
      operator: "est",
      value: [] as unknown as DraftRule["value"],
      points: 10,
      label: "Nouvelle règle",
      position: rules.length,
    }]);
  };

  const visibleSimFields = getVisibleFields(
    answerable as unknown as MarketingFormField[], answers,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Seuils de priorité</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Prospect urgent à partir de</Label>
              <Input
                type="number" min={0} value={urgentThreshold}
                onChange={(e) => onThresholdsChange(Number(e.target.value) || 0, qualifiedThreshold)}
              />
            </div>
            <div className="space-y-2">
              <Label>Prospect qualifié à partir de</Label>
              <Input
                type="number" min={0} value={qualifiedThreshold}
                onChange={(e) => onThresholdsChange(urgentThreshold, Number(e.target.value) || 0)}
              />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Score maximal atteignable avec les règles actuelles : <strong>{maxScore} points</strong>.
              En dessous du seuil qualifié, le prospect est classé « à entretenir ».
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{rules.length} règle(s) de qualification</p>
          <Button size="sm" onClick={addRule} disabled={answerable.length === 0}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter une règle
          </Button>
        </div>

        {asRows.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
            Aucune règle : toutes les réponses obtiendront un score de 0 et seront classées « à entretenir ».
          </Card>
        ) : (
          <div className="space-y-3">
            {asRows.map((rule) => {
              const field = answerable.find((f) => f.field_key === rule.field_key);
              const options = field ? parseOptions(field.options) : [];
              const opMeta = OPERATORS.find((o) => o.value === rule.operator);
              return (
                <Card key={rule.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Input
                        value={rule.label}
                        onChange={(e) => update(rule.id, { label: e.target.value })}
                        placeholder="Intitulé lisible dans le détail du score"
                        className="font-medium"
                      />
                      <div className="flex w-32 shrink-0 items-center gap-1">
                        <Input
                          type="number" value={rule.points}
                          onChange={(e) => update(rule.id, { points: Number(e.target.value) || 0 })}
                        />
                        <span className="text-xs text-muted-foreground">pts</span>
                      </div>
                      <Button
                        variant="ghost" size="icon" aria-label="Supprimer la règle"
                        onClick={() => onRulesChange(rules.filter((r) => r.id !== rule.id))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Select value={rule.field_key} onValueChange={(v) => update(rule.id, { field_key: v, value: [] as unknown as DraftRule["value"] })}>
                        <SelectTrigger><SelectValue placeholder="Champ observé" /></SelectTrigger>
                        <SelectContent>
                          {answerable.map((f) => (
                            <SelectItem key={f.id} value={f.field_key}>{f.label || f.field_key}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={rule.operator} onValueChange={(v: ScoringOperator) => update(rule.id, { operator: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {opMeta?.needsValues && (
                      options.length > 0 && rule.operator !== "superieur_a" ? (
                        <div className="flex flex-wrap gap-2">
                          {options.map((o) => {
                            const active = rule.valueList.includes(o);
                            return (
                              <Button
                                key={o} type="button" size="sm"
                                variant={active ? "default" : "outline"}
                                onClick={() => update(rule.id, {
                                  value: (active
                                    ? rule.valueList.filter((v) => v !== o)
                                    : [...rule.valueList, o]) as unknown as DraftRule["value"],
                                })}
                              >
                                {o}
                              </Button>
                            );
                          })}
                        </div>
                      ) : (
                        <Input
                          value={rule.valueList.join(", ")}
                          onChange={(e) => update(rule.id, {
                            value: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) as unknown as DraftRule["value"],
                          })}
                          placeholder={rule.operator === "superieur_a" ? "50" : "Valeurs séparées par une virgule"}
                        />
                      )
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Card className="h-fit lg:sticky lg:top-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-4 w-4" /> Simulateur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
            <p className="text-3xl font-bold">{simulation.score}</p>
            <p className="text-xs text-muted-foreground">points sur {maxScore}</p>
            <Badge className="mt-2" variant={priority === "urgent" ? "destructive" : priority === "qualifie" ? "default" : "secondary"}>
              {PRIORITY_LABELS[priority]}
            </Badge>
          </div>

          {simulation.breakdown.length > 0 && (
            <div className="space-y-1 text-sm">
              {simulation.breakdown.map((line, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{line.label}</span>
                  <span className="font-medium">+{line.points}</span>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <p className="text-xs text-muted-foreground">
            Répondez ici comme le ferait un prospect : le score se recalcule immédiatement, rien n'est enregistré.
          </p>

          <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
            {visibleSimFields.map((f) => (
              <FormFieldInput
                key={f.id}
                field={f as unknown as MarketingFormField}
                value={answers[f.field_key]}
                onChange={(v: AnswerValue) => setAnswers((a) => ({ ...a, [f.field_key]: v }))}
                dial={dial}
                onDialChange={setDial}
              />
            ))}
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={() => setAnswers({})}>
            Réinitialiser le simulateur
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
