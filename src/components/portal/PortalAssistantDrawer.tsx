import { useEffect, useRef, useState } from"react";
import { supabase } from"@/integrations/supabase/client";
import { useAuthSession } from"@/hooks/use-auth-session";
import { Button } from"@/components/ui/button";
import { Sparkles, Loader2, Send, Trash2, X, MessageCircle } from"lucide-react";
import { cn } from"@/lib/utils";
import { toast } from"sonner";

interface Msg { id?: string; role:"user"|"assistant"|"system"; content: string }

const SUGGESTED = [
"Combien ai-je de factures impayées ?",
"Où en sont mes formations ?",
"Statut de mes derniers tickets ?",
];

export function PortalAssistantDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
 const { user } = useAuthSession();
 const [messages, setMessages] = useState<Msg[]>([]);
 const [input, setInput] = useState("");
 const [busy, setBusy] = useState(false);
 const scrollRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLTextAreaElement>(null);

 // Load history when panel opens
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
 if (!open) return;
 requestAnimationFrame(() => {
 scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior:"smooth"});
 });
 }, [messages, open, busy]);

 useEffect(() => {
 if (open) inputRef.current?.focus();
 }, [open]);

 const send = async (text?: string) => {
 const content = (text ?? input).trim();
 if (!content || busy) return;
 const next: Msg[] = [...messages, { role:"user", content }];
 setMessages(next);
 setInput("");
 setBusy(true);
 try {
 const { data, error } = await supabase.functions.invoke("portal-assistant", {
 body: { messages: next.map(({ role, content }) => ({ role, content })) },
 });
 if (error) throw error;
 setMessages([...next, { role:"assistant", content: (data as any)?.reply ??"(aucune réponse)"}]);
 } catch (e: any) {
 toast.error(e?.message ||"Assistant indisponible");
 setMessages(next);
 } finally {
 setBusy(false);
 }
 };

 const clear = async () => {
 if (!user || !confirm("Effacer toute la conversation ?")) return;
 await (supabase.from("portal_assistant_messages") as any).delete().eq("user_id", user.id);
 setMessages([]);
 };

 if (!open) return null;

 return (
 <div
 role="dialog" aria-label="Assistant CloudMature"
  className={cn(
"fixed z-[70] bottom-4 right-4 md:bottom-6 md:right-6",
"w-[calc(100vw-2rem)] max-w-[400px] h-[min(70vh,600px)]",
"rounded-2xl shadow-2xl border border-border bg-background/95 backdrop-blur-xl",
"flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200",
 )}
 >
 {/* Header */}
 <div className="flex items-center gap-3 px-4 py-3 bg-primary text-white">
 <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
 <Sparkles size={18} />
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-sm font-semibold leading-tight truncate">Assistant CloudMature</p>
 <p className="text-[11px] text-white/80 truncate">Factures, tickets, formations…</p>
 </div>
 <button
 type="button" aria-label="Fermer" onClick={() => onOpenChange(false)}
 className="h-8 w-8 rounded-md hover:bg-white/15 flex items-center justify-center transition-colors" >
 <X size={18} />
 </button>
 </div>

 {/* Messages */}
 <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
 {messages.length === 0 && (
 <>
 <div className="rounded-xl bg-muted/60 px-3 py-2.5 text-foreground/85">
 Bonjour ! Je peux vous renseigner sur vos factures, tickets, formations et votre compte CloudMature. Comment puis-je vous aider ?
 </div>
 <div className="flex flex-wrap gap-1.5 pt-1">
 {SUGGESTED.map((s) => (
 <button
 key={s}
 type="button" onClick={() => send(s)}
 className="text-xs px-2.5 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors" >
 {s}
 </button>
 ))}
 </div>
 </>
 )}
 {messages.map((m, i) => (
 <div key={m.id ?? i} className={cn("flex", m.role ==="user"?"justify-end":"justify-start")}>
 <div
 className={cn(
"max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed whitespace-pre-wrap",
 m.role ==="user" ?"bg-primary text-primary-foreground rounded-br-md" :"bg-muted/70 text-foreground rounded-bl-md",
 )}
 >
 {m.content}
 </div>
 </div>
 ))}
 {busy && (
 <div className="flex justify-start">
 <div className="bg-muted/70 rounded-2xl rounded-bl-md px-3 py-2 flex items-center gap-2 text-muted-foreground text-xs">
 <Loader2 size={14} className="animate-spin"/> Réflexion en cours…
 </div>
 </div>
 )}
 </div>

 {/* Composer */}
 <form
 onSubmit={(e) => { e.preventDefault(); void send(); }}
 className="border-t border-border bg-background/80 p-2.5" >
 <div className="flex items-end gap-2">
 <textarea
 ref={inputRef}
 value={input}
 onChange={(e) => setInput(e.target.value)}
 onKeyDown={(e) => { if (e.key ==="Enter"&& !e.shiftKey) { e.preventDefault(); void send(); } }}
 rows={3}
 placeholder="Écrivez votre question…" maxLength={1000}
 disabled={busy}
 className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] max-h-48" />
 <Button
 type="submit" size="icon" disabled={!input.trim() || busy}
 className="h-9 w-9 shrink-0 bg-primary" aria-label="Envoyer" >
 {busy ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
 </Button>
 </div>
 <div className="flex items-center justify-between mt-1.5 px-1">
 <p className="text-[10px] text-muted-foreground leading-snug">
 Entrée pour envoyer · Shift+Entrée nouvelle ligne
 </p>
 {messages.length > 0 && (
 <button
 type="button" onClick={clear}
 className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1" >
 <Trash2 className="h-3 w-3"/> Effacer
 </button>
 )}
 </div>
 </form>
 </div>
 );
}

/** Floating launcher button — sits bottom-right of the portal. */
export function PortalAssistantLauncher() {
 const [open, setOpen] = useState(false);
 return (
 <>
 <button
 onClick={() => setOpen(true)}
 className={cn(
"fixed z-[60] bottom-20 right-4 md:bottom-6 md:right-6",
"h-14 w-14 rounded-full shadow-2xl flex items-center justify-center",
"bg-primary text-white",
"ring-4 ring-primary/20 hover:scale-105 transition-transform",
 open &&"hidden",
 )}
 title="Assistant CloudMature" aria-label="Ouvrir l'assistant IA" >
 <MessageCircle size={24} />
 <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse"/>
 </button>
 <PortalAssistantDrawer open={open} onOpenChange={setOpen} />
 </>
 );
}
