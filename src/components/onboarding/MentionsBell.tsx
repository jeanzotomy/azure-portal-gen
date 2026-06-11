import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AtSign, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface MentionNotif {
  id: string;
  comment_id: string;
  training_id: string;
  from_name: string;
  excerpt: string;
  read_at: string | null;
  created_at: string;
}

const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "à l'instant";
  if (d < 3600) return `${Math.floor(d / 60)} min`;
  if (d < 86400) return `${Math.floor(d / 3600)} h`;
  return `${Math.floor(d / 86400)} j`;
};

export function MentionsBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<MentionNotif[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await (supabase.from("training_mention_notifications") as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as any) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`mentions-${userId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "training_mention_notifications", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const unread = items.filter(i => !i.read_at).length;

  const markRead = async (id?: string) => {
    const q = (supabase.from("training_mention_notifications") as any)
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    if (id) q.eq("id", id);
    await q;
    load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative h-8 bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white">
          <AtSign className="h-4 w-4" />
          <span className="ml-1 text-xs hidden sm:inline">Mentions</span>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center animate-pulse">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-semibold text-sm flex items-center gap-1">
            <AtSign className="h-4 w-4 text-primary" />
            Mes mentions
          </div>
          {unread > 0 && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => markRead()}>
              <Check className="h-3 w-3 mr-1" />Tout marquer lu
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground text-center">Aucune mention pour l'instant.</div>
          ) : (
            items.map(n => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left p-3 border-b last:border-b-0 hover:bg-muted/40 transition ${!n.read_at ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{n.from_name}</span>
                  <span className="text-[10px] text-muted-foreground">vous a mentionné · {timeAgo(n.created_at)}</span>
                  {!n.read_at && <span className="ml-auto h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.excerpt}</div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
