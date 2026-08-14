import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSeo } from "@/hooks/use-seo";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuditBanner } from "@/components/marketing/AuditBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRY_DIAL_CODES, applyDialCode } from "@/lib/country-dial-codes";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, Mail, Phone, Globe, ExternalLink } from "lucide-react";

const STORAGE_KEY = "cm_audit_microsoft_answers";
const CAMPAIGN_SLUG = "audit-licences-microsoft";
const CONSENT_TEXT =
  "J'accepte que Cloud Mature collecte et utilise les informations communiquées dans ce formulaire afin de traiter ma demande d'audit et de me contacter au sujet de ses solutions Microsoft. Je comprends que je peux retirer mon consentement à tout moment en écrivant à info@cloudmature.com.";

type QuestionType = "text" | "textarea" | "single" | "select" | "multi" | "email" | "phone" | "datetime";

interface Question {
  id: string;
  section: string;
  label: string;
  hint?: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
  maxSelections?: number;
  visible?: (a: Answers) => boolean;
}

type Answers = Record<string, string | string[]>;

const SECTIONS = {
  company: "Entreprise",
  licences: "Licences Microsoft",
  contact: "Personne à contacter",
};

const QUESTIONS: Question[] = [
  { id: "company_name", section: SECTIONS.company, label: "Nom de l'entreprise", type: "text", required: true },
  {
    id: "sector", section: SECTIONS.company, label: "Secteur d'activité", type: "single", required: true,
    options: [
      "Mines et sous-traitance minière", "Banque, assurance ou microfinance", "Télécommunications",
      "Informatique et services numériques", "BTP et immobilier", "Transport et logistique",
      "Commerce et distribution", "Industrie", "ONG ou organisation internationale",
      "Administration publique", "Santé", "Éducation", "Cabinet ou services professionnels", "Autre",
    ],
  },
  {
    id: "city", section: SECTIONS.company, label: "Ville principale", type: "select", required: true,
    options: ["Conakry", "Boké", "Kamsar", "Kindia", "Mamou", "Labé", "Kankan", "Nzérékoré", "Autre"],
  },
  {
    id: "employee_count_range", section: SECTIONS.company, label: "Nombre approximatif d'employés",
    type: "single", required: true,
    options: ["1 à 10", "11 à 25", "26 à 50", "51 à 100", "101 à 250", "Plus de 250"],
  },
  {
    id: "uses_microsoft", section: SECTIONS.licences,
    label: "Utilisez-vous actuellement des produits ou licences Microsoft ?",
    type: "single", required: true, options: ["Oui", "Non", "Je ne sais pas"],
  },
  {
    id: "microsoft_products", section: SECTIONS.licences,
    label: "Quelles solutions Microsoft utilisez-vous actuellement ?",
    hint: "Plusieurs réponses possibles.",
    type: "multi", required: true,
    visible: (a) => a.uses_microsoft === "Oui",
    options: [
      "Microsoft 365 Business Basic", "Microsoft 365 Business Standard", "Microsoft 365 Business Premium",
      "Microsoft 365 E1", "Microsoft 365 E3", "Microsoft 365 E5", "Microsoft Azure", "Windows Server",
      "Power BI", "Dynamics 365", "Microsoft Copilot", "Exchange Online", "Teams",
      "SharePoint ou OneDrive", "Autre", "Je ne connais pas les licences utilisées",
    ],
  },
  {
    id: "users_to_cover", section: SECTIONS.licences,
    label: "Combien d'utilisateurs doivent être couverts par les licences ?",
    type: "single", required: true,
    options: ["1 à 10", "11 à 25", "26 à 50", "51 à 100", "101 à 250", "Plus de 250", "Je ne sais pas encore"],
  },
  {
    id: "renewal_timeline", section: SECTIONS.licences,
    label: "Quand vos licences doivent-elles être renouvelées ?",
    type: "single", required: true,
    options: [
      "Dans moins de 30 jours", "Dans 1 à 3 mois", "Dans 4 à 6 mois", "Dans 7 à 12 mois",
      "Dans plus de 12 mois", "Je ne connais pas la date", "Je n'ai pas encore de licences",
    ],
  },
  {
    id: "has_current_provider", section: SECTIONS.licences,
    label: "Avez-vous actuellement un fournisseur de licences Microsoft ?",
    type: "single", required: true,
    options: ["Oui", "Non", "Je ne sais pas", "Je préfère ne pas répondre"],
  },
  {
    id: "main_needs", section: SECTIONS.licences, label: "Quel est votre principal besoin ?",
    hint: "3 réponses maximum.", type: "multi", required: true, maxSelections: 3,
    options: [
      "Renouveler mes licences", "Acheter de nouvelles licences", "Réduire mes coûts",
      "Vérifier les licences inutilisées", "Choisir une formule adaptée", "Migrer vers Microsoft 365",
      "Améliorer la sécurité", "Sauvegarder et protéger mes données", "Déployer Microsoft Copilot",
      "Migrer vers Azure", "Obtenir du support technique", "Recevoir un devis", "Obtenir des conseils",
    ],
  },
  {
    id: "additional_info", section: SECTIONS.licences, label: "Informations complémentaires",
    hint: "Décrivez brièvement votre environnement, vos difficultés ou votre projet.",
    type: "textarea", required: false,
  },
  { id: "full_name", section: SECTIONS.contact, label: "Prénom et nom", type: "text", required: true },
  {
    id: "job_title", section: SECTIONS.contact, label: "Fonction", type: "single", required: true,
    options: [
      "Directeur général", "Directeur informatique ou DSI", "Responsable informatique",
      "Directeur administratif et financier", "Responsable administratif", "Responsable des achats",
      "Responsable des ressources humaines", "Consultant ou prestataire", "Autre",
    ],
  },
  { id: "email", section: SECTIONS.contact, label: "Adresse e-mail professionnelle", type: "email", required: true },
  { id: "phone", section: SECTIONS.contact, label: "Numéro de téléphone ou WhatsApp", type: "phone", required: true },
  {
    id: "preferred_contact_method", section: SECTIONS.contact, label: "Moyen de contact préféré",
    type: "single", required: true,
    options: ["Téléphone", "WhatsApp", "E-mail", "Visioconférence Microsoft Teams"],
  },
  {
    id: "contact_timing", section: SECTIONS.contact, label: "Quand souhaitez-vous être contacté ?",
    type: "single", required: true,
    options: ["Dès que possible", "Dans les 24 heures", "Dans les 48 heures", "Cette semaine", "À une date précise"],
  },
  {
    id: "preferred_datetime", section: SECTIONS.contact, label: "Choisissez une date et une heure",
    type: "datetime", required: true,
    visible: (a) => a.contact_timing === "À une date précise",
  },
];

const DIAL_OPTIONS = Object.entries(COUNTRY_DIAL_CODES)
  .map(([iso, dial]) => ({ iso, dial }))
  .sort((a, b) => (a.iso === "GN" ? -1 : b.iso === "GN" ? 1 : a.iso.localeCompare(b.iso)));

const asArray = (v: string | string[] | undefined) => (Array.isArray(v) ? v : []);
const asText = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default function MicrosoftAuditPage() {
  useSeo({
    title: "Audit gratuit de vos licences Microsoft | Cloud Mature",
    description:
      "Vos licences Microsoft expirent dans moins de 6 mois ? Demandez un audit gratuit : échéances, optimisation des coûts et licences adaptées à vos besoins.",
    path: "/audit-licences-microsoft",
  });

  const [phase, setPhase] = useState<"intro" | "form" | "done">("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [dial, setDial] = useState("+224");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const advanceTimer = useRef<number | null>(null);

  // Restore progress
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { answers?: Answers; step?: number; phase?: string; dial?: string };
        if (parsed.answers) setAnswers(parsed.answers);
        if (typeof parsed.step === "number") setStepIndex(parsed.step);
        if (parsed.dial) setDial(parsed.dial);
        if (parsed.phase === "form") setPhase("form");
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (phase === "done") return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, step: stepIndex, phase, dial }));
    } catch { /* ignore */ }
  }, [answers, stepIndex, phase, dial]);

  // Campaign attribution + view tracking
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("marketing_campaigns")
        .select("id")
        .eq("slug", CAMPAIGN_SLUG)
        .maybeSingle();
      if (cancelled || !data?.id) return;
      setCampaignId(data.id);
      const params = new URLSearchParams(window.location.search);
      await supabase.from("campaign_events").insert({
        campaign_id: data.id,
        type: "view",
        source: params.get("utm_source"),
        utm: {
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign"),
        },
        user_agent: navigator.userAgent,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => { if (advanceTimer.current) window.clearTimeout(advanceTimer.current); }, []);

  // Initialise the phone answer with the dial code so the field is never "visually filled but empty"
  useEffect(() => {
    setAnswers((prev) => (typeof prev.phone === "string" && prev.phone
      ? prev
      : { ...prev, phone: applyDialCode("", dial) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drop answers belonging to branches that are no longer visible
  useEffect(() => {
    setAnswers((prev) => {
      const stale = QUESTIONS.filter((q) => q.visible && !q.visible(prev) && prev[q.id] !== undefined);
      if (stale.length === 0) return prev;
      const next = { ...prev };
      stale.forEach((q) => { delete next[q.id]; });
      return next;
    });
  }, [answers]);

  const visibleQuestions = useMemo(
    () => QUESTIONS.filter((q) => !q.visible || q.visible(answers)),
    [answers],
  );
  const totalSteps = visibleQuestions.length + 1; // + consent screen
  const isConsentStep = stepIndex >= visibleQuestions.length;
  const question = isConsentStep ? null : visibleQuestions[stepIndex];
  const progress = Math.round(((stepIndex + (isConsentStep ? 1 : 0)) / totalSteps) * 100);

  const setValue = useCallback((id: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setError(null);
  }, []);


  const validate = (q: Question): string | null => {
    const value = answers[q.id];
    if (q.type === "multi") {
      if (q.required && asArray(value).length === 0) return "Veuillez sélectionner au moins une réponse.";
      return null;
    }
    const text = asText(value).trim();
    if (q.required && !text) return "Cette réponse est obligatoire.";
    if (q.type === "email" && text && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text))
      return "Veuillez saisir une adresse e-mail valide.";
    if (q.type === "phone" && text.replace(/\D/g, "").length < 8)
      return "Veuillez saisir un numéro de téléphone valide.";
    if (q.type === "datetime" && text && new Date(text).getTime() < Date.now())
      return "Veuillez choisir une date à venir.";
    return null;
  };

  const goNext = () => {
    if (question) {
      const err = validate(question);
      if (err) { setError(err); return; }
    }
    setError(null);
    setStepIndex((i) => Math.min(i + 1, visibleQuestions.length));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setError(null);
    setStepIndex((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pickSingle = (q: Question, option: string) => {
    setValue(q.id, option);
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      setStepIndex((i) => Math.min(i + 1, visibleQuestions.length));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 260);
  };

  const toggleMulti = (q: Question, option: string) => {
    const current = asArray(answers[q.id]);
    const has = current.includes(option);
    if (!has && q.maxSelections && current.length >= q.maxSelections) return;
    setValue(q.id, has ? current.filter((o) => o !== option) : [...current, option]);
  };

  const startForm = async () => {
    setPhase("form");
    setStepIndex(0);
    if (campaignId) {
      await supabase.from("campaign_events").insert({
        campaign_id: campaignId, type: "start", user_agent: navigator.userAgent,
      });
    }
  };

  const submit = async () => {
    if (!consent) return;
    setSubmitting(true);
    setError(null);
    const params = new URLSearchParams(window.location.search);
    const payload = {
      campaign_id: campaignId,
      website: honeypot,
      consent_given: true,
      consent_text: CONSENT_TEXT,
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      company_name: asText(answers.company_name),
      sector: asText(answers.sector),
      city: asText(answers.city),
      employee_count_range: asText(answers.employee_count_range),
      uses_microsoft: asText(answers.uses_microsoft),
      microsoft_products: asArray(answers.microsoft_products),
      users_to_cover: asText(answers.users_to_cover),
      renewal_timeline: asText(answers.renewal_timeline),
      has_current_provider: asText(answers.has_current_provider),
      main_needs: asArray(answers.main_needs),
      additional_info: asText(answers.additional_info),
      full_name: asText(answers.full_name),
      job_title: asText(answers.job_title),
      email: asText(answers.email),
      phone: asText(answers.phone),
      preferred_contact_method: asText(answers.preferred_contact_method),
      contact_timing: asText(answers.contact_timing),
      preferred_datetime: asText(answers.preferred_datetime)
        ? new Date(asText(answers.preferred_datetime)).toISOString()
        : null,
    };

    const { data, error: fnError } = await supabase.functions.invoke("submit-microsoft-audit", { body: payload });
    setSubmitting(false);

    if (fnError || !(data as { success?: boolean } | null)?.success) {
      setError("L'envoi a échoué. Vérifiez votre connexion et réessayez, ou écrivez-nous à info@cloudmature.com.");
      return;
    }
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setPhase("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6">
        {phase === "intro" && (
          <div className="space-y-8">
            <AuditBanner />
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                Vos licences Microsoft expirent-elles dans moins de 6 mois ?
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Anticipez votre renouvellement et évitez les interruptions ou les dépenses inutiles.
                Répondez à quelques questions pour demander un audit gratuit de vos licences Microsoft.
                Un conseiller Cloud Mature examinera vos échéances, vos besoins et les possibilités
                d'optimisation. Durée : environ 2 minutes.
              </p>
              <Button size="lg" className="mt-6 h-12 w-full text-base sm:w-auto" onClick={startForm}>
                Commencer mon audit
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </section>
          </div>
        )}

        {phase === "form" && (
          <form onSubmit={(e) => e.preventDefault()}>
            {/* Honeypot (invisible to humans), mounted from the very first step */}
            <input
              type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
              value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
              className="pointer-events-none absolute h-0 w-0 opacity-0"
            />
            {/* Sticky progress */}
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

            <div key={isConsentStep ? "consent" : question?.id} className="animate-fade-slide-in">
              {question && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {question.section}
                  </p>
                  <h2 className="mt-2 text-xl font-bold leading-snug text-foreground sm:text-2xl">
                    {question.label}
                    {!question.required && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">(facultatif)</span>
                    )}
                  </h2>
                  {question.hint && (
                    <p className="mt-2 text-sm text-muted-foreground">{question.hint}</p>
                  )}

                  <div className="mt-6 space-y-3">
                    {question.type === "text" && (
                      <Input
                        autoFocus
                        value={asText(answers[question.id])}
                        onChange={(e) => setValue(question.id, e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && goNext()}
                        className="h-12 text-base"
                        placeholder="Votre réponse"
                      />
                    )}

                    {question.type === "email" && (
                      <Input
                        autoFocus type="email" inputMode="email" autoComplete="email"
                        value={asText(answers[question.id])}
                        onChange={(e) => setValue(question.id, e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && goNext()}
                        className="h-12 text-base"
                        placeholder="prenom.nom@entreprise.com"
                      />
                    )}

                    {question.type === "textarea" && (
                      <Textarea
                        autoFocus rows={5}
                        value={asText(answers[question.id])}
                        onChange={(e) => setValue(question.id, e.target.value)}
                        className="text-base"
                        placeholder="Votre réponse"
                      />
                    )}

                    {question.type === "datetime" && (
                      <Input
                        autoFocus type="datetime-local"
                        min={new Date(Date.now() + 3600_000).toISOString().slice(0, 16)}
                        value={asText(answers[question.id])}
                        onChange={(e) => setValue(question.id, e.target.value)}
                        className="h-12 text-base"
                      />
                    )}

                    {question.type === "phone" && (
                      <div className="flex gap-2">
                        <Select
                          value={dial}
                          onValueChange={(v) => {
                            setDial(v);
                            setValue(question.id, applyDialCode(asText(answers[question.id]), v));
                          }}
                        >
                          <SelectTrigger className="h-12 w-32 text-base">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {DIAL_OPTIONS.map(({ iso, dial: d }) => (
                              <SelectItem key={iso} value={d}>{iso} {d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          autoFocus type="tel" inputMode="tel"
                          value={asText(answers[question.id]) || `${dial} `}
                          onChange={(e) => setValue(question.id, e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && goNext()}
                          className="h-12 flex-1 text-base"
                          placeholder="+224 6XX XX XX XX"
                        />
                      </div>
                    )}

                    {question.type === "select" && (
                      <Select
                        value={asText(answers[question.id])}
                        onValueChange={(v) => pickSingle(question, v)}
                      >
                        <SelectTrigger className="h-12 text-base">
                          <SelectValue placeholder="Sélectionnez une ville" />
                        </SelectTrigger>
                        <SelectContent>
                          {question.options?.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {question.type === "single" &&
                      question.options?.map((option) => {
                        const selected = asText(answers[question.id]) === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => pickSingle(question, option)}
                            className={cn(
                              "flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-base transition-all",
                              selected
                                ? "border-primary bg-primary/10 font-semibold text-foreground"
                                : "border-border bg-background hover:border-primary/50 hover:bg-muted/50",
                            )}
                          >
                            <span>{option}</span>
                            {selected && <Check className="h-5 w-5 shrink-0 text-primary" />}
                          </button>
                        );
                      })}

                    {question.type === "multi" && (
                      <>
                        {question.maxSelections &&
                          asArray(answers[question.id]).length >= question.maxSelections && (
                            <p className="text-sm font-medium text-primary">
                              {question.maxSelections} réponses maximum
                            </p>
                          )}
                        {question.options?.map((option) => {
                          const values = asArray(answers[question.id]);
                          const selected = values.includes(option);
                          const disabled =
                            !selected && !!question.maxSelections && values.length >= question.maxSelections;
                          return (
                            <button
                              key={option}
                              type="button"
                              disabled={disabled}
                              onClick={() => toggleMulti(question, option)}
                              className={cn(
                                "flex min-h-[48px] w-full items-center gap-3 rounded-xl border p-3 text-left text-base transition-all",
                                selected
                                  ? "border-primary bg-primary/10 font-semibold text-foreground"
                                  : "border-border bg-background hover:border-primary/50 hover:bg-muted/50",
                                disabled && "cursor-not-allowed opacity-40 hover:border-border hover:bg-background",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                                )}
                              >
                                {selected && <Check className="h-3.5 w-3.5" />}
                              </span>
                              <span>{option}</span>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {error && <p className="mt-4 text-sm font-medium text-destructive">{error}</p>}

                  <div className="mt-7 flex items-center gap-3">
                    {stepIndex > 0 && (
                      <Button variant="outline" className="h-12" onClick={goBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                      </Button>
                    )}
                    {question.type !== "single" && question.type !== "select" && (
                      <Button className="h-12 flex-1 text-base sm:flex-none" onClick={goNext}>
                        Suivant <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {isConsentStep && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Consentement</p>
                  <h2 className="mt-2 text-xl font-bold text-foreground sm:text-2xl">
                    Dernière étape avant l'envoi
                  </h2>

                  <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
                    <Checkbox
                      checked={consent}
                      onCheckedChange={(v) => setConsent(v === true)}
                      className="mt-0.5 h-5 w-5"
                      aria-label="J'accepte la collecte de mes informations"
                    />
                    <span className="text-sm leading-relaxed text-foreground">{CONSENT_TEXT}</span>
                  </label>

                  <p className="mt-3 text-sm">
                    <Link
                      to="/privacy" target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4"
                    >
                      Politique de confidentialité <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </p>

                  {/* Honeypot (invisible to humans) */}
                  <input
                    type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                    value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
                    className="pointer-events-none absolute h-0 w-0 opacity-0"
                  />

                  {error && <p className="mt-4 text-sm font-medium text-destructive">{error}</p>}

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button variant="outline" className="h-12" onClick={goBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                    </Button>
                    <Button
                      className="h-12 flex-1 text-base"
                      disabled={!consent || submitting}
                      onClick={submit}
                    >
                      {submitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi en cours…</>
                      ) : (
                        "Demander mon audit gratuit"
                      )}
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
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 animate-check-pop">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" aria-hidden="true" />
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              Votre demande a bien été enregistrée !
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Merci pour votre confiance. Un conseiller Cloud Mature vous contactera prochainement afin
              d'examiner vos licences, votre prochaine échéance et les possibilités d'optimisation.
            </p>

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

            <Button asChild size="lg" className="h-12 w-full text-base sm:w-auto">
              <a href="https://www.cloudmature.com">Visiter Cloud Mature</a>
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
