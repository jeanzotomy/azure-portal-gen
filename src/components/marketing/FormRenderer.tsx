import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { AuditBanner } from "@/components/marketing/AuditBanner";
import { FormFieldInput } from "@/components/marketing/FormFieldInput";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, Globe, Loader2, Mail, Phone,
} from "lucide-react";
import { applyDialCode } from "@/lib/country-dial-codes";
import {
  asText, getVisibleFields, isAnswerable, isMultiValue, parseVisibleWhen, validateFieldValue,
  type AnswerValue, type Answers, type MarketingForm, type MarketingFormField,
} from "@/lib/marketing-forms";

const DEFAULT_CONSENT =
  "J'accepte que Cloud Mature collecte et utilise les informations communiquées dans ce formulaire afin de traiter ma demande et de me contacter à ce sujet.";

const ERROR_MESSAGES: Record<string, string> = {
  rate_limited: "Trop de demandes envoyées depuis cette connexion. Réessayez plus tard.",
  invalid_email: "Adresse e-mail invalide.",
  consent_required: "Vous devez accepter la collecte de vos informations.",
  missing_fields: "Certaines réponses obligatoires sont manquantes.",
  invalid_field: "Une réponse ne respecte pas le format attendu.",
  form_not_found: "Ce formulaire est introuvable.",
  form_closed: "Ce formulaire n'accepte plus de réponses.",
  form_expired: "La période de réponse à ce formulaire est terminée.",
  max_submissions_reached: "Ce formulaire a atteint son nombre maximal de réponses.",
  insert_failed:
    "Une erreur est survenue lors de l'enregistrement. Réessayez ou écrivez-nous à info@cloudmature.com.",
};

interface Props {
  form: MarketingForm;
  fields: MarketingFormField[];
  /** Aperçu de l'éditeur : rien n'est envoyé, rien n'est enregistré. */
  preview?: boolean;
}

export function FormRenderer({ form, fields, preview = false }: Props) {
  const storageKey = `cm_form_${form.slug}`;
  const consentText = form.consent_text?.trim() || DEFAULT_CONSENT;
  const singleScreen = form.layout === "page_unique";

  const [phase, setPhase] = useState<"intro" | "form" | "done">("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [dial, setDial] = useState("+224");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const submissionId = useRef<string | null>(null);
  const advanceTimer = useRef<number | null>(null);
  const startedRef = useRef(false);

  const utm = useMemo(() => {
    if (typeof window === "undefined") return {};
    const p = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
      const v = p.get(k);
      if (v) out[k] = v;
    });
    return out;
  }, []);

  /* ---------- reprise de progression ---------- */
  useEffect(() => {
    if (preview) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const p = JSON.parse(raw) as { answers?: Answers; step?: number; phase?: string; dial?: string; sid?: string };
      if (p.answers) setAnswers(p.answers);
      if (typeof p.step === "number") setStepIndex(p.step);
      if (p.dial) setDial(p.dial);
      if (p.sid) { submissionId.current = p.sid; startedRef.current = true; }
      if (p.phase === "form") setPhase("form");
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (preview || phase === "done") return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        answers, step: stepIndex, phase, dial, sid: submissionId.current,
      }));
    } catch { /* ignore */ }
  }, [answers, stepIndex, phase, dial, storageKey, preview]);

  useEffect(() => () => { if (advanceTimer.current) window.clearTimeout(advanceTimer.current); }, []);

  /* ---------- initialisation du téléphone avec l'indicatif ---------- */
  useEffect(() => {
    const phoneField = fields.find((f) => f.type === "telephone");
    if (!phoneField) return;
    setAnswers((prev) => (typeof prev[phoneField.field_key] === "string" && prev[phoneField.field_key]
      ? prev
      : { ...prev, [phoneField.field_key]: applyDialCode("", dial) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.length]);

  /* ---------- effacement des branches devenues invisibles ---------- */
  useEffect(() => {
    setAnswers((prev) => {
      const stale = fields.filter(
        (f) => parseVisibleWhen(f.visible_when) && prev[f.field_key] !== undefined
          && !getVisibleFields([f], prev).length,
      );
      if (stale.length === 0) return prev;
      const next = { ...prev };
      stale.forEach((f) => { delete next[f.field_key]; });
      return next;
    });
  }, [answers, fields]);

  const visibleFields = useMemo(() => getVisibleFields(fields, answers), [fields, answers]);
  const answerable = useMemo(() => visibleFields.filter((f) => isAnswerable(f.type)), [visibleFields]);

  const consentStepCount = form.consent_required ? 1 : 0;
  const totalSteps = (singleScreen ? 1 : visibleFields.length) + consentStepCount;
  const isConsentStep = singleScreen ? stepIndex >= 1 : stepIndex >= visibleFields.length;
  const currentField = singleScreen || isConsentStep ? null : visibleFields[stepIndex];
  const progress = Math.round((Math.min(stepIndex + (isConsentStep ? 1 : 0), totalSteps) / totalSteps) * 100);

  const setValue = useCallback((key: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: "" } : prev));
  }, []);

  /* ---------- enregistrement de la soumission commencée ---------- */
  const trackStart = useCallback(async (payloadAnswers: Answers) => {
    if (preview || startedRef.current) return;
    startedRef.current = true;
    try {
      const { data } = await supabase.functions.invoke("submit-marketing-form", {
        body: { action: "start", slug: form.slug, answers: payloadAnswers, utm },
      });
      const sid = (data as { submissionId?: string } | null)?.submissionId;
      if (sid) submissionId.current = sid;
    } catch { startedRef.current = false; }
  }, [form.slug, preview, utm]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const goNext = () => {
    if (currentField) {
      const err = validateFieldValue(currentField, answers[currentField.field_key]);
      if (err) { setError(err); return; }
    }
    if (singleScreen) {
      const errs: Record<string, string> = {};
      answerable.forEach((f) => {
        const e = validateFieldValue(f, answers[f.field_key]);
        if (e) errs[f.field_key] = e;
      });
      setFieldErrors(errs);
      if (Object.keys(errs).length > 0) {
        setError("Certaines réponses obligatoires sont manquantes.");
        return;
      }
    }
    setError(null);
    void trackStart(answers);
    setStepIndex((i) => Math.min(i + 1, singleScreen ? 1 : visibleFields.length));
    scrollTop();
  };

  const goBack = () => { setError(null); setStepIndex((i) => Math.max(0, i - 1)); scrollTop(); };

  const pickSingle = (field: MarketingFormField, option: string) => {
    setValue(field.field_key, option);
    if (singleScreen) return;
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      void trackStart({ ...answers, [field.field_key]: option });
      setStepIndex((i) => Math.min(i + 1, visibleFields.length));
      scrollTop();
    }, 260);
  };

  const startForm = () => { setPhase("form"); setStepIndex(0); scrollTop(); };

  const submit = async () => {
    if (form.consent_required && !consent) return;
    if (preview) { setPhase("done"); scrollTop(); return; }
    setSubmitting(true);
    setError(null);

    const { data, error: fnError } = await supabase.functions.invoke("submit-marketing-form", {
      body: {
        action: "submit",
        slug: form.slug,
        submissionId: submissionId.current,
        answers,
        website: honeypot,
        consent_given: consent || !form.consent_required,
        consent_text: consentText,
        utm,
      },
    });
    setSubmitting(false);

    const result = data as { success?: boolean; error?: string; message?: string } | null;
    if (fnError || !result?.success) {
      let code = result?.error;
      let serverMessage = result?.message;
      const ctx = (fnError as unknown as { context?: unknown } | null)?.context;
      if (!code && ctx instanceof Response) {
        try {
          const body = await ctx.clone().json();
          code = body?.error;
          serverMessage = body?.message;
        } catch { /* ignore */ }
      }
      setError(
        (code && ERROR_MESSAGES[code]) || serverMessage ||
        "L'envoi a échoué. Vérifiez votre connexion et réessayez, ou écrivez-nous à info@cloudmature.com.",
      );
      return;
    }

    try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
    if (form.confirmation_redirect_url) {
      window.location.href = form.confirmation_redirect_url;
      return;
    }
    setPhase("done");
    scrollTop();
  };

  /* ------------------------------------------------------------------ */

  const renderField = (field: MarketingFormField, autoFocus: boolean) => {
    if (!isAnswerable(field.type)) {
      return (
        <h3 className="border-b border-border pb-2 text-lg font-bold text-foreground">{field.label}</h3>
      );
    }
    return (
      <FormFieldInput
        field={field}
        value={answers[field.field_key]}
        dial={dial}
        autoFocus={autoFocus}
        onChange={(v) => setValue(field.field_key, v)}
        onDialChange={setDial}
        onPickSingle={
          field.type === "choix_unique" || field.type === "liste_deroulante" || field.type === "oui_non"
            ? (v) => pickSingle(field, v)
            : undefined
        }
        onEnter={singleScreen ? undefined : goNext}
      />
    );
  };

  return (
    <div className="space-y-8">
      {phase === "intro" && (
        <>
          {form.banner_variant === "audit_microsoft" && <AuditBanner />}
          {form.banner_variant === "image" && form.banner_image_url && (
            <img
              src={form.banner_image_url} alt={form.title}
              className="w-full rounded-2xl border border-border object-cover" loading="lazy"
            />
          )}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{form.title}</h1>
            {form.intro_text && (
              <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
                {form.intro_text}
              </p>
            )}
            <Button size="lg" className="mt-6 h-12 w-full text-base sm:w-auto" onClick={startForm}>
              {form.start_button_label} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </section>
        </>
      )}

      {phase === "form" && (
        <form onSubmit={(e) => e.preventDefault()}>
          {/* Honeypot, monté dès le premier écran */}
          <input
            type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
            value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
            className="pointer-events-none absolute h-0 w-0 opacity-0"
          />

          {form.show_progress && (
            <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>
                  {isConsentStep
                    ? `Étape ${totalSteps} sur ${totalSteps} · Consentement`
                    : `Étape ${stepIndex + 1} sur ${totalSteps}`}
                </span>
                <span className="text-primary">{progress} %</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div key={isConsentStep ? "consent" : currentField?.id ?? "page"} className="animate-fade-slide-in">
            {/* --- une question par écran --- */}
            {currentField && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
                {currentField.section && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {currentField.section}
                  </p>
                )}
                <h2 className="mt-2 text-xl font-bold leading-snug text-foreground sm:text-2xl">
                  {currentField.label}
                  {!currentField.required && isAnswerable(currentField.type) && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">(facultatif)</span>
                  )}
                </h2>
                {currentField.help_text && (
                  <p className="mt-2 text-sm text-muted-foreground">{currentField.help_text}</p>
                )}

                <div className="mt-6">{renderField(currentField, true)}</div>

                {error && <p className="mt-4 text-sm font-medium text-destructive">{error}</p>}

                <div className="mt-7 flex items-center gap-3">
                  {stepIndex > 0 && (
                    <Button type="button" variant="outline" className="h-12" onClick={goBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                    </Button>
                  )}
                  {(!["choix_unique", "liste_deroulante", "oui_non", "echelle"].includes(currentField.type)
                    || !!asText(answers[currentField.field_key])) && (
                    <Button type="button" className="h-12 flex-1 text-base sm:flex-none" onClick={goNext}>
                      Suivant <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* --- page unique --- */}
            {singleScreen && !isConsentStep && (
              <div className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{form.title}</h1>
                  {form.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{form.description}</p>
                  )}
                </div>
                {visibleFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    {isAnswerable(field.type) && (
                      <label className="block text-base font-semibold text-foreground">
                        {field.label}
                        {!field.required && (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">(facultatif)</span>
                        )}
                      </label>
                    )}
                    {field.help_text && <p className="text-sm text-muted-foreground">{field.help_text}</p>}
                    {renderField(field, false)}
                    {fieldErrors[field.field_key] && (
                      <p className="text-sm font-medium text-destructive">{fieldErrors[field.field_key]}</p>
                    )}
                  </div>
                ))}
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                <Button type="button" className="h-12 w-full text-base" onClick={goNext}>
                  Continuer <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* --- consentement --- */}
            {isConsentStep && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Consentement</p>
                <h2 className="mt-2 text-xl font-bold text-foreground sm:text-2xl">
                  Dernière étape avant l'envoi
                </h2>

                <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
                  <Checkbox
                    checked={consent} onCheckedChange={(v) => setConsent(v === true)}
                    className="mt-0.5 h-5 w-5"
                    aria-label="J'accepte la collecte de mes informations"
                  />
                  <span className="text-sm leading-relaxed text-foreground">{consentText}</span>
                </label>

                <p className="mt-3 text-sm">
                  <Link
                    to="/privacy" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4"
                  >
                    Politique de confidentialité <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </p>

                {error && <p className="mt-4 text-sm font-medium text-destructive">{error}</p>}

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button type="button" variant="outline" className="h-12" onClick={goBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                  </Button>
                  <Button
                    type="button" className="h-12 flex-1 text-base"
                    disabled={(form.consent_required && !consent) || submitting}
                    onClick={submit}
                  >
                    {submitting
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi en cours…</>
                      : form.submit_label}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </form>
      )}

      {phase === "done" && (
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <div className="flex justify-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10 animate-check-pop">
              <CheckCircle2 className="h-12 w-12 text-success" aria-hidden="true" />
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{form.confirmation_title}</h1>
          {form.confirmation_text && (
            <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
              {form.confirmation_text}
            </p>
          )}

          <div className="rounded-2xl border border-border bg-card p-5 text-left shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-primary">Demande urgente</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a href="tel:+224626441150" className="flex min-h-[44px] items-center gap-3 font-medium text-foreground hover:text-primary">
                  <Phone className="h-4 w-4 text-primary" /> +224 626 441 150 (téléphone)
                </a>
              </li>
              <li>
                <a href="https://wa.me/224626441150" target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center gap-3 font-medium text-foreground hover:text-primary">
                  <Phone className="h-4 w-4 text-primary" /> +224 626 441 150 (WhatsApp)
                </a>
              </li>
              <li>
                <a href="mailto:info@cloudmature.com" className="flex min-h-[44px] items-center gap-3 font-medium text-foreground hover:text-primary">
                  <Mail className="h-4 w-4 text-primary" /> info@cloudmature.com
                </a>
              </li>
              <li>
                <a href="https://www.cloudmature.com" target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center gap-3 font-medium text-foreground hover:text-primary">
                  <Globe className="h-4 w-4 text-primary" /> www.cloudmature.com
                </a>
              </li>
            </ul>
          </div>

          <Button asChild size="lg" className={cn("h-12 w-full text-base sm:w-auto")}>
            <a href="https://www.cloudmature.com" target="_blank" rel="noreferrer">
              {form.confirmation_button_label || "Visiter Cloud Mature"}
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

export { isMultiValue };
