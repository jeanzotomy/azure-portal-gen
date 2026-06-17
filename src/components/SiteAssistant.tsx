import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, Send, X, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * "Mature" — Assistant virtuel public du site Cloud Mature.
 * - Affiché uniquement sur les routes publiques (marketing).
 * - Périmètre strict: Cloud Mature uniquement. Aucune donnée personnelle/confidentielle.
 * - Historique conservé en mémoire (pas de persistance).
 */
type Msg = { role: "user" | "assistant"; content: string };

const PUBLIC_PATH_PREFIXES = ["/", "/pricing", "/formations", "/careers", "/privacy", "/terms"];

function isPublicRoute(pathname: string): boolean {
  // Exclure les zones authentifiées / techniques
  const blocked = [
    "/auth", "/portal", "/admin", "/rh", "/onboarding", "/mfa",
    "/reset-password", "/install", "/candidature", "/unsubscribe", "/checkout", "/verify",
  ];
  if (blocked.some((p) => pathname === p || pathname.startsWith(p + "/"))) return false;
  // Tout le reste du marketing est OK (y compris /careers/:slug, /formations/...)
  return PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p === "/" ? "/" : p + "/")) || pathname === "/";
}

function renderRich(text: string) {
  // Rendu léger: lignes, puces "- ", listes numérotées "1.".
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let buf: string[] = [];
  let mode: "ul" | "ol" | "p" | null = null;
  const flush = (key: number) => {
    if (!mode || buf.length === 0) { buf = []; mode = null; return; }
    if (mode === "ul") blocks.push(<ul key={key} className="list-disc pl-4 space-y-0.5">{buf.map((b,i)=><li key={i}>{b}</li>)}</ul>);
    else if (mode === "ol") blocks.push(<ol key={key} className="list-decimal pl-4 space-y-0.5">{buf.map((b,i)=><li key={i}>{b}</li>)}</ol>);
    else blocks.push(<p key={key}>{buf.join(" ")}</p>);
    buf = []; mode = null;
  };
  lines.forEach((raw, idx) => {
    const t = raw.trim();
    if (!t) { flush(idx); return; }
    const ul = t.match(/^[-•]\s+(.+)$/);
    const ol = t.match(/^\d{1,2}[.)]\s+(.+)$/);
    if (ul) { if (mode !== "ul") flush(idx); mode = "ul"; buf.push(ul[1]); return; }
    if (ol) { if (mode !== "ol") flush(idx); mode = "ol"; buf.push(ol[1]); return; }
    if (mode !== "p") flush(idx);
    mode = "p"; buf.push(t);
  });
  flush(lines.length);
  return <div className="space-y-2">{blocks}</div>;
}

export default function SiteAssistant() {
  const { pathname } = useLocation();
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const enabled = isPublicRoute(pathname);
  const MAX_USER_QUESTIONS = 5;
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const limitReached = userMessageCount >= MAX_USER_QUESTIONS;

  const i18n = locale === "en"
    ? {
        title: "Mature — Cloud Mature Assistant",
        subtitle: "Ask anything about our services.",
        placeholder: "Ask about our services, expertise, training…",
        send: "Send",
        open: "Open assistant",
        close: "Close",
        welcome: "Hi! I'm Mature, the Cloud Mature virtual assistant. I can help you discover our services, expertise (Cloud, DevOps, Data, AI), sectors, methodology and trainings. How can I help?",
        disclaimer: "Scope limited to Cloud Mature. Do not share personal or confidential data.",
        error: "Sorry, something went wrong. Please try again.",
        limitTitle: "Thank you for our exchange.",
        limitBody: `To keep our conversations focused, this assistant is limited to ${MAX_USER_QUESTIONS} questions per session. For a deeper discussion, our team will gladly take over via the contact form.`,
        limitCta: "Go to contact form",
      }
    : {
        title: "Mature — Assistant Cloud Mature",
        subtitle: "Posez vos questions sur nos services.",
        placeholder: "Posez votre question sur nos services, expertises, formations…",
        send: "Envoyer",
        open: "Ouvrir l'assistant",
        close: "Fermer",
        welcome: "Bonjour ! Je suis Mature, l'assistant virtuel de Cloud Mature. Je peux vous présenter nos services, expertises (Cloud, DevOps, Data, IA), secteurs, méthodologie et formations. Comment puis-je vous aider ?",
        disclaimer: "Périmètre limité à Cloud Mature. Ne partagez pas de données personnelles ou confidentielles.",
        error: "Désolé, une erreur est survenue. Merci de réessayer.",
        limitTitle: "Merci pour cet échange.",
        limitBody: `Pour garder nos conversations ciblées, cet assistant est limité à ${MAX_USER_QUESTIONS} questions par session. Pour aller plus loin, notre équipe se fera un plaisir de prendre le relais via le formulaire de contact.`,
        limitCta: "Accéder au formulaire de contact",
      };

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages, open, loading]);

  useEffect(() => {
    if (open && !limitReached) inputRef.current?.focus();
  }, [open, limitReached]);

  const suggested = locale === "en"
    ? ["What services do you offer?", "How do you ensure security and quality?", "Do you offer trainings?", "How can I contact you?"]
    : ["Quels sont vos services ?", "Comment garantissez-vous sécurité et qualité ?", "Proposez-vous des formations ?", "Comment vous contacter ?"];

  const goToContact = () => {
    setOpen(false);
    // Navigate to the contact section on the home page.
    if (pathname === "/") {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = "/#contact";
    }
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading || limitReached) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("site-assistant", {
        body: { messages: next, locale },
      });
      if (error) throw new Error(error.message);
      const reply = (data as any)?.reply || (data as any)?.error || i18n.error;
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: i18n.error }]);
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) return null;


  return (
    <>
      {/* Bouton flottant */}
      <button
        type="button"
        aria-label={i18n.open}
        onClick={() => setOpen(true)}
        className={cn(
          "fixed z-[60] bottom-20 right-4 md:bottom-6 md:right-6",
          "h-14 w-14 rounded-full shadow-2xl flex items-center justify-center",
          "bg-gradient-to-br from-primary to-[#007aa3] text-white",
          "ring-4 ring-primary/20 hover:scale-105 transition-transform",
          open && "hidden",
        )}
      >
        <MessageCircle size={24} />
        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
      </button>

      {/* Panneau de chat */}
      {open && (
        <div
          role="dialog"
          aria-label={i18n.title}
          className={cn(
            "fixed z-[70] bottom-4 right-4 md:bottom-6 md:right-6",
            "w-[calc(100vw-2rem)] max-w-[400px] h-[min(70vh,600px)]",
            "rounded-2xl shadow-2xl border border-border bg-background/95 backdrop-blur-xl",
            "flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200",
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary to-[#007aa3] text-white">
            <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight truncate">{i18n.title}</p>
              <p className="text-[11px] text-white/80 truncate">{i18n.subtitle}</p>
            </div>
            <button
              type="button"
              aria-label={i18n.close}
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-md hover:bg-white/15 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
            {messages.length === 0 && (
              <>
                <div className="rounded-xl bg-muted/60 px-3 py-2.5 text-foreground/85">
                  {i18n.welcome}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {suggested.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="text-xs px-2.5 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted/70 text-foreground rounded-bl-md",
                  )}
                >
                  {m.role === "assistant" ? renderRich(m.content) : <p className="whitespace-pre-line">{m.content}</p>}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/70 rounded-2xl rounded-bl-md px-3 py-2 flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 size={14} className="animate-spin" />
                  {locale === "en" ? "Thinking…" : "Réflexion en cours…"}
                </div>
              </div>
            )}
          </div>

          {/* Composer ou bloc de limite atteinte */}
          {limitReached ? (
            <div className="border-t border-border bg-gradient-to-br from-primary/5 to-accent/5 p-4 space-y-2.5">
              <p className="text-sm font-semibold text-foreground">{i18n.limitTitle}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{i18n.limitBody}</p>
              <Button
                type="button"
                onClick={goToContact}
                className="w-full bg-gradient-to-br from-primary to-[#007aa3] text-white"
              >
                {i18n.limitCta}
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="border-t border-border bg-background/80 p-2.5"
            >
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  rows={3}
                  placeholder={i18n.placeholder}
                  maxLength={1000}
                  className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] max-h-48"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || loading}
                  className="h-9 w-9 shrink-0 bg-gradient-to-br from-primary to-[#007aa3]"
                  aria-label={i18n.send}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 px-1 leading-snug">
                {i18n.disclaimer}
              </p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5 px-1 leading-snug text-right">
                {userMessageCount} / {MAX_USER_QUESTIONS}
              </p>
            </form>
          )}

        </div>
      )}
    </>
  );
}
