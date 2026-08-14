import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRY_DIAL_CODES, applyDialCode } from "@/lib/country-dial-codes";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import {
  asArray, asText, parseOptions, toLocalInputValue,
  type AnswerValue, type MarketingFormField,
} from "@/lib/marketing-forms";

const DIAL_OPTIONS = Object.entries(COUNTRY_DIAL_CODES)
  .map(([iso, dial]) => ({ iso, dial }))
  .sort((a, b) => (a.iso === "GN" ? -1 : b.iso === "GN" ? 1 : a.iso.localeCompare(b.iso)));

interface Props {
  field: MarketingFormField;
  value: AnswerValue | undefined;
  dial: string;
  autoFocus?: boolean;
  onChange: (value: AnswerValue) => void;
  onDialChange: (dial: string) => void;
  /** Choix unique : avance automatique. */
  onPickSingle?: (value: string) => void;
  onEnter?: () => void;
}

export function FormFieldInput({
  field, value, dial, autoFocus, onChange, onDialChange, onPickSingle, onEnter,
}: Props) {
  const options = parseOptions(field.options);
  const text = asText(value);
  const pick = (v: string) => (onPickSingle ? onPickSingle(v) : onChange(v));

  switch (field.type) {
    case "texte_long":
      return (
        <Textarea
          autoFocus={autoFocus} rows={5} value={text}
          onChange={(e) => onChange(e.target.value)}
          className="text-base" placeholder={field.placeholder ?? "Votre réponse"}
        />
      );

    case "email":
      return (
        <Input
          autoFocus={autoFocus} type="email" inputMode="email" autoComplete="email" value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          className="h-12 text-base" placeholder={field.placeholder ?? "prenom.nom@entreprise.com"}
        />
      );

    case "nombre":
      return (
        <Input
          autoFocus={autoFocus} type="number" inputMode="numeric" value={text}
          min={field.min_value ?? undefined} max={field.max_value ?? undefined}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          className="h-12 text-base" placeholder={field.placeholder ?? "0"}
        />
      );

    case "date":
      return (
        <Input
          autoFocus={autoFocus} type="date" value={text}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 text-base"
        />
      );

    case "date_heure":
      return (
        <Input
          autoFocus={autoFocus} type="datetime-local"
          min={toLocalInputValue(new Date(Date.now() + 3600_000))}
          value={text} onChange={(e) => onChange(e.target.value)}
          className="h-12 text-base"
        />
      );

    case "fichier":
      return (
        <Input
          type="file" className="h-12 cursor-pointer text-base"
          onChange={(e) => onChange(e.target.files?.[0]?.name ?? "")}
        />
      );

    case "telephone":
      return (
        <div className="flex gap-2">
          <Select
            value={dial}
            onValueChange={(v) => { onDialChange(v); onChange(applyDialCode(text, v)); }}
          >
            <SelectTrigger className="h-12 w-32 text-base"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {DIAL_OPTIONS.map(({ iso, dial: d }) => (
                <SelectItem key={iso} value={d}>{iso} {d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            autoFocus={autoFocus} type="tel" inputMode="tel" value={text}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
            className="h-12 flex-1 text-base" placeholder={field.placeholder ?? "+224 6XX XX XX XX"}
          />
        </div>
      );

    case "liste_deroulante":
      return (
        <Select value={text} onValueChange={pick}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder={field.placeholder ?? "Sélectionnez une réponse"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      );

    case "oui_non":
      return (
        <div className="space-y-3">
          {["Oui", "Non"].map((o) => (
            <OptionButton key={o} label={o} selected={text === o} onClick={() => pick(o)} />
          ))}
        </div>
      );

    case "echelle": {
      const min = field.min_value !== null ? Number(field.min_value) : 1;
      const max = field.max_value !== null ? Number(field.max_value) : 5;
      const steps = Array.from({ length: Math.max(1, max - min + 1) }, (_, i) => String(min + i));
      return (
        <div className="flex flex-wrap gap-2">
          {steps.map((s) => (
            <button
              key={s} type="button" onClick={() => pick(s)}
              className={cn(
                "flex h-12 min-w-[48px] flex-1 items-center justify-center rounded-xl border text-base font-semibold transition-all",
                text === s
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background hover:border-primary/50 hover:bg-muted/50",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      );
    }

    case "choix_unique":
      return (
        <div className="space-y-3">
          {options.map((o) => (
            <OptionButton key={o} label={o} selected={text === o} onClick={() => pick(o)} />
          ))}
        </div>
      );

    case "choix_multiple": {
      const values = asArray(value);
      const limit = field.max_selections ?? 0;
      const atLimit = limit > 0 && values.length >= limit;
      return (
        <div className="space-y-3">
          {atLimit && (
            <p className="text-sm font-medium text-primary">{limit} réponses maximum</p>
          )}
          {options.map((o) => {
            const selected = values.includes(o);
            const disabled = !selected && atLimit;
            return (
              <button
                key={o} type="button" disabled={disabled}
                onClick={() => onChange(selected ? values.filter((v) => v !== o) : [...values, o])}
                className={cn(
                  "flex min-h-[48px] w-full items-center gap-3 rounded-xl border p-3 text-left text-base transition-all",
                  selected
                    ? "border-primary bg-primary/10 font-semibold text-foreground"
                    : "border-border bg-background hover:border-primary/50 hover:bg-muted/50",
                  disabled && "cursor-not-allowed opacity-40 hover:border-border hover:bg-background",
                )}
              >
                <span className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}>
                  {selected && <Check className="h-3.5 w-3.5" />}
                </span>
                <span>{o}</span>
              </button>
            );
          })}
        </div>
      );
    }

    default:
      return (
        <Input
          autoFocus={autoFocus} value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          className="h-12 text-base" placeholder={field.placeholder ?? "Votre réponse"}
        />
      );
  }
}

function OptionButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className={cn(
        "flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-base transition-all",
        selected
          ? "border-primary bg-primary/10 font-semibold text-foreground"
          : "border-border bg-background hover:border-primary/50 hover:bg-muted/50",
      )}
    >
      <span>{label}</span>
      {selected && <Check className="h-5 w-5 shrink-0 text-primary" />}
    </button>
  );
}
