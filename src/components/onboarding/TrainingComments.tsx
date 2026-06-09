import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Send, AtSign, Trash2, SmilePlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

interface CoLearner { user_id: string; full_name: string; role: string; }
interface Comment {
  id: string;
  training_id: string;
  module_index: number | null;
  user_id: string;
  author_name: string;
  body: string;
  mentions: string[];
  created_at: string;
}

const initials = (name: string) =>
  name.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "à l'instant";
  if (d < 3600) return `il y a ${Math.floor(d / 60)} min`;
  if (d < 86400) return `il y a ${Math.floor(d / 3600)} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function TrainingComments({
  trainingId,
  moduleIndex,
  currentUserId,
}: {
  trainingId: string;
  moduleIndex?: number | null;
  currentUserId: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [coLearners, setCoLearners] = useState<CoLearner[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [body, setBody] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const [selectedMentions, setSelectedMentions] = useState<Record<string, string>>({}); // userId -> displayName
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Initial load + realtime
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [cRes, lRes] = await Promise.all([
        (supabase.from("training_comments") as any)
          .select("*")
          .eq("training_id", trainingId)
          .order("created_at", { ascending: true }),
        supabase.rpc("list_training_co_learners" as any, { _training_id: trainingId }),
      ]);
      if (!active) return;
      if (cRes.data) setComments(cRes.data);
      if (lRes.data) setCoLearners(lRes.data as any);
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel(`tc-${trainingId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "training_comments", filter: `training_id=eq.${trainingId}` },
        (payload) => setComments(prev => prev.find(c => c.id === (payload.new as any).id) ? prev : [...prev, payload.new as any]),
      )
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "training_comments", filter: `training_id=eq.${trainingId}` },
        (payload) => setComments(prev => prev.filter(c => c.id !== (payload.old as any).id)),
      )
      .subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [trainingId]);

  // Detect @ mentions while typing
  const onChangeBody = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setBody(v);
    const caret = e.target.selectionStart || 0;
    const upto = v.slice(0, caret);
    const m = /(?:^|\s)@([\p{L}0-9_-]{0,30})$/u.exec(upto);
    if (m) {
      setMentionStart(caret - m[1].length - 1);
      setMentionQuery(m[1].toLowerCase());
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }
  };

  const insertMention = (u: CoLearner) => {
    if (mentionStart < 0 || !taRef.current) return;
    const handle = u.full_name.replace(/\s+/g, "_");
    const before = body.slice(0, mentionStart);
    const after = body.slice((taRef.current.selectionStart || 0));
    const next = `${before}@${handle} ${after}`;
    setBody(next);
    setSelectedMentions({ ...selectedMentions, [u.user_id]: u.full_name });
    setMentionQuery(null);
    setMentionStart(-1);
    setTimeout(() => taRef.current?.focus(), 0);
  };

  const submit = async () => {
    if (!body.trim()) return;
    setPosting(true);
    // Resolve mentions from text — only keep those referenced by `@Name` (handle uses underscores)
    const used = Object.entries(selectedMentions)
      .filter(([, name]) => new RegExp(`@${name.replace(/\s+/g, "_")}\\b`).test(body))
      .map(([id]) => id);

    const { error } = await supabase.rpc("post_training_comment" as any, {
      _training_id: trainingId,
      _module_index: moduleIndex ?? null,
      _body: body.trim(),
      _mentions: used,
    });
    setPosting(false);
    if (error) return toast.error(error.message);
    setBody("");
    setSelectedMentions({});
    if (used.length > 0) toast.success(`Commentaire publié — ${used.length} personne(s) notifiée(s)`);
    else toast.success("Commentaire publié");
  };

  const remove = async (id: string) => {
    const { error } = await (supabase.from("training_comments") as any).delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const filtered = mentionQuery !== null
    ? coLearners.filter(c => c.user_id !== currentUserId && c.full_name.toLowerCase().includes(mentionQuery)).slice(0, 6)
    : [];

  const renderBody = (text: string, mentions: string[]) => {
    const mentionNames = coLearners.filter(c => mentions.includes(c.user_id)).map(c => c.full_name);
    let nodes: Array<string | JSX.Element> = [text];
    mentionNames.forEach((name) => {
      const handle = `@${name.replace(/\s+/g, "_")}`;
      const next: Array<string | JSX.Element> = [];
      nodes.forEach((n) => {
        if (typeof n !== "string") { next.push(n); return; }
        const parts = n.split(handle);
        parts.forEach((p, i) => {
          next.push(p);
          if (i < parts.length - 1) {
            next.push(<span key={`${handle}-${next.length}`} className="font-semibold text-primary bg-primary/10 px-1 rounded">{handle}</span>);
          }
        });
      });
      nodes = next;
    });
    return <span className="whitespace-pre-wrap">{nodes.map((n, i) => <span key={i}>{n}</span>)}</span>;
  };

  return (
    <div className="border-t bg-white">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Discussion entre apprenants</span>
          <Badge variant="outline" className="text-[10px]">{comments.length}</Badge>
        </div>

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : comments.length === 0 ? (
          <div className="text-xs text-muted-foreground italic py-2">
            Aucun commentaire. Lance la discussion et mentionne un co-apprenant avec <code className="bg-muted px-1 rounded">@</code>.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {comments.map(c => (
              <div key={c.id} className="flex gap-2 group">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-[#007aa3] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {initials(c.author_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold">{c.author_name}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                    {c.user_id === currentUserId && (
                      <button onClick={() => remove(c.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-600 transition">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-xs leading-relaxed">{renderBody(c.body, c.mentions || [])}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 relative">
          <textarea
            ref={taRef}
            value={body}
            onChange={onChangeBody}
            placeholder="Écris un commentaire… utilise @ pour mentionner un co-apprenant"
            className="w-full min-h-[70px] border rounded-md p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            disabled={posting}
          />
          {mentionQuery !== null && filtered.length > 0 && (
            <div className="absolute z-10 bottom-full mb-1 left-2 bg-white border rounded-md shadow-lg max-h-56 overflow-y-auto min-w-[220px]">
              {filtered.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => insertMention(u)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-primary/5 text-xs"
                >
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                    {initials(u.full_name)}
                  </div>
                  <span className="flex-1 truncate">{u.full_name}</span>
                  <Badge variant="outline" className="text-[9px] capitalize">{u.role}</Badge>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <AtSign className="h-3 w-3" />
              {Object.keys(selectedMentions).length > 0
                ? `${Object.keys(selectedMentions).length} mention(s)`
                : "Tapez @ pour mentionner"}
            </div>
            <Button size="sm" onClick={submit} disabled={posting || !body.trim()} className="bg-gradient-to-r from-primary to-[#007aa3] h-7 text-xs">
              {posting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
              Publier
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
