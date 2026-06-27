import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sparkles, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Msg { id?: string; role: "user" | "assistant" | "system"; content: string }

export function PortalAssistantDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuthSession();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversation history when drawer opens
  useEffect(() => {
    if (!open || !user) return;
    void (async () => {
      const { data } = await (supabase.from("portal_assistant_messages") as any)
        .select("id, role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(30);
      setMessages((data ?? []) as Msg[]);
    })();
  }, [open, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("portal-assistant", {
        body: { messages: next.map(({ role, content }) => ({ role, content })) },
      });
      if (error) throw error;
      setMessages([...next, { role: "assistant", content: (data as any)?.reply ?? "(aucune réponse)" }]);
    } catch (e: any) {
      toast.error(e?.message || "Assistant indisponible");
      setMessages(next); // keep user msg
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    if (!user || !confirm("Effacer toute la conversation ?")) return;
    await (supabase.from("portal_assistant_messages") as any).delete().eq("user_id", user.id);
    setMessages([]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b bg-gradient-to-r from-primary to-[#007aa3]">
          <SheetTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Assistant CloudMature
          </SheetTitle>
          <p className="text-xs text-white/85">Posez vos questions sur vos factures, tickets ou formations.</p>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
          {messages.length === 0 && (
            <div className="text-xs text-muted-foreground italic text-center py-8">
              💡 Essayez : « Combien ai-je de factures impayées ? » ou « Où en sont mes formations ? »
            </div>
          )}
          {messages.map((m, i) => (
            <div key={m.id ?? i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-gradient-to-br from-primary to-[#007aa3] text-white rounded-br-sm"
                  : "bg-white border border-border rounded-bl-sm"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-white border border-border rounded-2xl px-3 py-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> L'assistant réfléchit…
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-background p-3 space-y-2">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Écrivez votre question…"
              rows={2}
              className="flex-1 resize-none rounded-md border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={busy}
            />
            <Button size="icon" onClick={send} disabled={busy || !input.trim()} className="bg-gradient-to-br from-primary to-[#007aa3]">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">⌘/Entrée pour envoyer · Shift+Entrée nouvelle ligne</span>
            {messages.length > 0 && (
              <Button size="sm" variant="ghost" onClick={clear} className="h-6 text-[10px] text-muted-foreground">
                <Trash2 className="h-3 w-3 mr-1" /> Effacer
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Floating launcher button — sits bottom-right of the portal. */
export function PortalAssistantLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-primary to-[#007aa3] text-white shadow-xl hover:scale-105 transition-transform inline-flex items-center justify-center"
        title="Assistant IA"
        aria-label="Assistant IA"
        aria-label="Ouvrir l'assistant IA"
        title="Assistant CloudMature"
      >
        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
      <PortalAssistantDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
