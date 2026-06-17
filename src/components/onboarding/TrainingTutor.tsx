import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bot, Send, X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Msg { role: "user" | "assistant"; content: string; }

// Linkify URLs and internal paths
function linkify(text: string): ReactNode[] {
  const regex = /(https?:\/\/[^\s)]+|(?<![\w/])\/(?:#?[a-z][a-z0-9\-/_#]*))/gi;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const url = m[0].replace(/[.,;:!?)]+$/, "");
    const trailing = m[0].slice(url.length);
    const isInternal = url.startsWith("/");
    out.push(
      <a key={`l${key++}`} href={url} target={isInternal ? undefined : "_blank"} rel={isInternal ? undefined : "noopener noreferrer"} className="text-primary underline underline-offset-2 hover:opacity-80">{url}</a>
    );
    if (trailing) out.push(trailing);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// Inline markdown: **bold**, *italic*, `code`
function renderInline(text: string): ReactNode[] {
  const cleaned = text.replace(/—/g, "-");
  const tokens: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(cleaned)) !== null) {
    if (m.index > last) tokens.push(...linkify(cleaned.slice(last, m.index)));
    if (m[2] !== undefined) tokens.push(<strong key={`b${key++}`} className="font-semibold text-foreground">{linkify(m[2])}</strong>);
    else if (m[3] !== undefined) tokens.push(<em key={`i${key++}`}>{linkify(m[3])}</em>);
    else if (m[4] !== undefined) tokens.push(<code key={`c${key++}`} className="px-1 py-0.5 rounded bg-cyan-100 text-cyan-900 text-[0.85em] font-mono">{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < cleaned.length) tokens.push(...linkify(cleaned.slice(last)));
  return tokens;
}

function renderRich(text: string) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let buf: string[] = [];
  let mode: "ul" | "ol" | "p" | null = null;
  const flush = (key: number) => {
    if (!mode || buf.length === 0) { buf = []; mode = null; return; }
    if (mode === "ul") blocks.push(<ul key={key} className="list-disc pl-5 space-y-1 my-1">{buf.map((b, i) => <li key={i}>{renderInline(b)}</li>)}</ul>);
    else if (mode === "ol") blocks.push(<ol key={key} className="list-decimal pl-5 space-y-1 my-1">{buf.map((b, i) => <li key={i}>{renderInline(b)}</li>)}</ol>);
    else blocks.push(<p key={key} className="leading-relaxed">{renderInline(buf.join(" "))}</p>);
    buf = []; mode = null;
  };
  lines.forEach((raw, idx) => {
    const t = raw.trim();
    if (!t) { flush(idx); return; }
    const ul = t.match(/^[-•*]\s+(.+)$/);
    const ol = t.match(/^\d{1,2}[.)]\s+(.+)$/);
    if (ul) { if (mode !== "ul") flush(idx); mode = "ul"; buf.push(ul[1]); return; }
    if (ol) { if (mode !== "ol") flush(idx); mode = "ol"; buf.push(ol[1]); return; }
    if (mode !== "p") flush(idx);
    mode = "p"; buf.push(t);
  });
  flush(lines.length);
  return <div className="space-y-2">{blocks}</div>;
}

export function TrainingTutor({ trainingId, trainingTitle, onClose }: { trainingId: string; trainingTitle: string; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: `Bonjour ! 👋 Je suis votre tuteur IA pour la formation « ${trainingTitle} ». Posez-moi vos questions sur le contenu et je vous aiderai à mieux comprendre.` },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/training-tutor`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          trainingId,
          messages: next.filter(m => m.role !== "assistant" || messages.indexOf(m) > 0).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erreur du tuteur IA");
        setMessages(prev => [...prev, { role: "assistant", content: "Désolé, je n'ai pas pu répondre. Réessayez dans un instant." }]);
        return;
      }

      // Parse SSE stream (OpenAI-compatible: data: {...} lines, finished with [DONE])
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content || "";
            if (delta) {
              assistantContent += delta;
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistantContent };
                return copy;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erreur réseau");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-lg md:rounded-lg w-full max-w-2xl h-[80vh] md:h-[70vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-primary-deep text-primary-foreground px-4 py-3 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-sm">Tuteur IA</div>
              <div className="text-xs text-cyan-100 truncate max-w-[260px]">{trainingTitle}</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gradient-to-b from-cyan-50/30 to-white">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-white whitespace-pre-wrap" : "bg-white border shadow-sm text-foreground"}`}>
                {m.role === "assistant" && i !== 0 && (
                  <div className="flex items-center gap-1 mb-1 text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">
                    <Bot className="h-3 w-3" /> Tuteur
                  </div>
                )}
                {m.role === "assistant"
                  ? (m.content
                      ? renderRich(m.content)
                      : (streaming && i === messages.length - 1 ? <Loader2 className="h-3 w-3 animate-spin" /> : null))
                  : m.content}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") send(); }}
            placeholder="Posez une question sur cette formation…"
            disabled={streaming}
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button size="sm" onClick={send} disabled={streaming || !input.trim()} className="bg-gradient-primary-deep text-primary-foreground">
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
