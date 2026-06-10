import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bot, Send, X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Msg { role: "user" | "assistant"; content: string; }

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
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-white" : "bg-white border shadow-sm"}`}>
                {m.role === "assistant" && i === 0 ? null : m.role === "assistant" && (
                  <div className="flex items-center gap-1 mb-0.5 text-[10px] text-muted-foreground uppercase font-semibold">
                    <Bot className="h-3 w-3" /> Tuteur
                  </div>
                )}
                {m.content || (streaming && i === messages.length - 1 ? <Loader2 className="h-3 w-3 animate-spin" /> : null)}
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
