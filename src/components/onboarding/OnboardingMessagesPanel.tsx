import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

interface Msg {
  id: string;
  message: string;
  is_admin: boolean;
  sender_id: string | null;
  created_at: string;
}

/**
 * Messagerie candidat ↔ RH liée à un processus d'onboarding.
 * - Le candidat envoie avec is_admin=false (RLS enforced).
 * - L'admin/gestionnaire envoie avec is_admin=true.
 */
export function OnboardingMessagesPanel({
  processId,
  asAdmin = false,
  currentUserId,
}: {
  processId: string;
  asAdmin?: boolean;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("onboarding_messages")
      .select("id, message, is_admin, sender_id, created_at")
      .eq("process_id", processId)
      .order("created_at", { ascending: true });
    if (!error) setMessages((data || []) as Msg[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = (supabase as any)
      .channel(`onb-msg-${processId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "onboarding_messages", filter: `process_id=eq.${processId}` },
        (payload: any) => {
          setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
        },
      )
      .subscribe();
    return () => {
      (supabase as any).removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const { error } = await (supabase as any).from("onboarding_messages").insert({
      process_id: processId,
      sender_id: currentUserId,
      is_admin: asAdmin,
      message: body,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
  };

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-primary-deep text-primary-foreground px-4 py-2.5 flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        <span className="font-semibold text-sm">
          {asAdmin ? "Messagerie avec le candidat" : "Messagerie avec le service RH"}
        </span>
      </div>

      <div ref={scrollRef} className="max-h-72 overflow-y-auto p-3 space-y-2 bg-muted/20">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            {asAdmin
              ? "Aucun message. Écrivez au candidat pour démarrer la conversation."
              : "Aucun message. Une question ? Écrivez au service RH."}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && (
                  <div className={`h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs ${m.is_admin ? "bg-primary/15 text-primary" : "bg-muted"}`}>
                    {m.is_admin ? <ShieldCheck className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : m.is_admin
                        ? "bg-white border rounded-bl-sm"
                        : "bg-white border rounded-bl-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.message}</div>
                  <div className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {m.is_admin && !mine && " · RH"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t bg-white flex gap-2 items-end">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={asAdmin ? "Répondre au candidat..." : "Écrire au service RH..."}
          rows={2}
          className="resize-none text-sm"
        />
        <Button onClick={send} disabled={sending || !text.trim()} size="sm" className="bg-gradient-primary-deep text-primary-foreground">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </Card>
  );
}
