import { useEffect, useRef, useState } from"react";
import { supabase } from"@/integrations/supabase/client";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Loader2, MessageSquare, Send, AtSign, Trash2, SmilePlus, HelpCircle, CheckCircle2, MessageCircle } from"lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from"@/components/ui/popover";
import { toast } from"sonner";
import { useUserRoles } from"@/hooks/use-admin";
import { LearnerFollowButton } from"@/components/training/LearnerFollowButton";

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
 is_question?: boolean | null;
 is_official_answer?: boolean | null;
 parent_comment_id?: string | null;
}

const initials = (name: string) =>
 name.split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() ||"?";

const timeAgo = (iso: string) => {
 const d = (Date.now() - new Date(iso).getTime()) / 1000;
 if (d < 60) return"à l'instant";
 if (d < 3600) return `il y a ${Math.floor(d / 60)} min`;
 if (d < 86400) return `il y a ${Math.floor(d / 3600)} h`;
 return new Date(iso).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"});
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
 const [postKind, setPostKind] = useState<"comment"|"question">("comment");
 const [filterKind, setFilterKind] = useState<"all"|"questions">("all");
 const [mentionQuery, setMentionQuery] = useState<string | null>(null);
 const [mentionStart, setMentionStart] = useState<number>(-1);
 const [selectedMentions, setSelectedMentions] = useState<Record<string, string>>({});
 const { isAdmin, isHr, isGestionnaire } = useUserRoles();
 const isStaff = isAdmin || isHr || isGestionnaire;
 // reactions: commentId -> emoji -> { count, mine }
 const [reactions, setReactions] = useState<Record<string, Record<string, { count: number; mine: boolean }>>>({});
 const taRef = useRef<HTMLTextAreaElement>(null);

 const EMOJIS = ["👍","❤️","🎯","💡","🔥","👏"];

 const ingestReaction = (row: any, op:"add"|"del") => {
 setReactions(prev => {
 const cid = row.comment_id;
 const em = row.emoji;
 const next = { ...prev, [cid]: { ...(prev[cid] || {}) } };
 const cur = next[cid][em] || { count: 0, mine: false };
 next[cid][em] = {
 count: Math.max(0, cur.count + (op ==="add"? 1 : -1)),
 mine: row.user_id === currentUserId ? op ==="add": cur.mine,
 };
 if (next[cid][em].count === 0) delete next[cid][em];
 return next;
 });
 };

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
 supabase.rpc("list_training_co_learners"as any, { _training_id: trainingId }),
 ]);
 if (!active) return;
 const list: Comment[] = cRes.data || [];
 if (cRes.data) setComments(list);
 if (lRes.data) setCoLearners(lRes.data as any);

 // Load reactions for all comments
 if (list.length > 0) {
 const ids = list.map(c => c.id);
 const { data: rxRows } = await (supabase.from("training_comment_reactions") as any)
 .select("comment_id, user_id, emoji")
 .in("comment_id", ids);
 if (active && rxRows) {
 const agg: Record<string, Record<string, { count: number; mine: boolean }>> = {};
 (rxRows as any[]).forEach(r => {
 agg[r.comment_id] = agg[r.comment_id] || {};
 const cur = agg[r.comment_id][r.emoji] || { count: 0, mine: false };
 agg[r.comment_id][r.emoji] = {
 count: cur.count + 1,
 mine: cur.mine || r.user_id === currentUserId,
 };
 });
 setReactions(agg);
 }
 }
 setLoading(false);
 };
 load();

 const ch = supabase
 .channel(`tc-${trainingId}`)
 .on("postgres_changes",
 { event:"INSERT", schema:"public", table:"training_comments", filter: `training_id=eq.${trainingId}` },
 (payload) => setComments(prev => prev.find(c => c.id === (payload.new as any).id) ? prev : [...prev, payload.new as any]),
 )
 .on("postgres_changes",
 { event:"DELETE", schema:"public", table:"training_comments", filter: `training_id=eq.${trainingId}` },
 (payload) => setComments(prev => prev.filter(c => c.id !== (payload.old as any).id)),
 )
 .on("postgres_changes",
 { event:"INSERT", schema:"public", table:"training_comment_reactions"},
 (payload) => ingestReaction(payload.new,"add"),
 )
 .on("postgres_changes",
 { event:"DELETE", schema:"public", table:"training_comment_reactions"},
 (payload) => ingestReaction(payload.old,"del"),
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
 const handle = u.full_name.replace(/\s+/g,"_");
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
 // Resolve mentions from text - only keep those referenced by `@Name` (handle uses underscores)
 const used = Object.entries(selectedMentions)
 .filter(([, name]) => new RegExp(`@${name.replace(/\s+/g,"_")}\\b`).test(body))
 .map(([id]) => id);

 const { data: newId, error } = await (supabase.rpc as any)("post_training_comment", {
 _training_id: trainingId,
 _module_index: moduleIndex ?? null,
 _body: body.trim(),
 _mentions: used,
 });
 if (error) {
 setPosting(false);
 return toast.error(error.message);
 }
 // Tag as question if requested (owner can update their own comment via RLS).
 if (postKind ==="question"&& newId) {
 await (supabase.from("training_comments") as any)
 .update({ is_question: true })
 .eq("id", newId);
 }
 setPosting(false);
 setBody("");
 setSelectedMentions({});
 setPostKind("comment");
 if (used.length > 0) toast.success(`${postKind ==="question"?"Question":"Commentaire"} publié(e) - ${used.length} personne(s) notifiée(s)`);
 else toast.success(postKind ==="question"?"Question publiée":"Commentaire publié");
 };

 const remove = async (id: string) => {
 const { error } = await (supabase.from("training_comments") as any).delete().eq("id", id);
 if (error) toast.error(error.message);
 };

 const toggleOfficialAnswer = async (id: string, current: boolean) => {
 const { error } = await (supabase.rpc as any)("mark_training_comment_official", {
 _comment_id: id,
 _is_official: !current,
 });
 if (error) return toast.error(error.message);
 toast.success(!current ?"Marqué comme réponse officielle":"Marquage retiré");
 // Optimistic local update (realtime won't fire because this is an UPDATE event we don't subscribe to).
 setComments((prev) => prev.map((c) => (c.id === id ? { ...c, is_official_answer: !current } : c)));
 };

 const toggleReaction = async (commentId: string, emoji: string) => {
 const mine = reactions[commentId]?.[emoji]?.mine;
 if (mine) {
 const { error } = await (supabase.from("training_comment_reactions") as any)
 .delete()
 .eq("comment_id", commentId)
 .eq("user_id", currentUserId)
 .eq("emoji", emoji);
 if (error) toast.error(error.message);
 } else {
 const { error } = await (supabase.from("training_comment_reactions") as any)
 .insert({ comment_id: commentId, user_id: currentUserId, emoji });
 if (error && !error.message.includes("duplicate")) toast.error(error.message);
 }
 };

 const filtered = mentionQuery !== null
 ? coLearners.filter(c => c.user_id !== currentUserId && c.full_name.toLowerCase().includes(mentionQuery)).slice(0, 6)
 : [];

 const renderBody = (text: string, mentions: string[]) => {
 const mentionNames = coLearners.filter(c => mentions.includes(c.user_id)).map(c => c.full_name);
 let nodes: Array<string | JSX.Element> = [text];
 mentionNames.forEach((name) => {
 const handle = `@${name.replace(/\s+/g,"_")}`;
 const next: Array<string | JSX.Element> = [];
 nodes.forEach((n) => {
 if (typeof n !=="string") { next.push(n); return; }
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

 const visibleComments = filterKind ==="questions"? comments.filter((c) => c.is_question) : comments;
 const questionsCount = comments.filter((c) => c.is_question).length;

 return (
 <div className="border-t bg-white">
 <div className="p-4">
 <div className="flex items-center gap-2 mb-3 flex-wrap">
 <MessageSquare className="h-4 w-4 text-primary"/>
 <span className="font-semibold text-sm">Discussion entre apprenants</span>
 <Badge variant="outline"className="text-[10px]">{comments.length}</Badge>
 {questionsCount > 0 && (
 <Badge variant="outline"className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">
 <HelpCircle className="h-3 w-3 mr-0.5"/> {questionsCount} question{questionsCount > 1 ?"s":""}
 </Badge>
 )}
 <div className="ml-auto inline-flex rounded-md border border-border overflow-hidden">
 <button
 type="button" onClick={() => setFilterKind("all")}
 className={`px-2 py-0.5 text-[10px] font-medium ${filterKind ==="all"?"bg-primary text-primary-foreground":"bg-background text-muted-foreground hover:bg-muted"}`}
 >
 Tout
 </button>
 <button
 type="button" onClick={() => setFilterKind("questions")}
 className={`px-2 py-0.5 text-[10px] font-medium border-l ${filterKind ==="questions"?"bg-primary text-primary-foreground":"bg-background text-muted-foreground hover:bg-muted"}`}
 >
 Q&R
 </button>
 </div>
 </div>

 {loading ? (
 <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/></div>
 ) : visibleComments.length === 0 ? (
 <div className="text-xs text-muted-foreground italic py-2">
 {filterKind ==="questions" ?"Aucune question publiée pour le moment." : <>Aucun commentaire. Lance la discussion et mentionne un co-apprenant avec <code className="bg-muted px-1 rounded">@</code>.</>}
 </div>
 ) : (
 <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
 {visibleComments.map(c => (
 <div key={c.id} className={`flex gap-2 group rounded-md p-2 ${c.is_official_answer ?"bg-emerald-50/60 border border-emerald-200": c.is_question ?"bg-amber-50/40 border border-amber-200":""}`}>
 <div className="h-7 w-7 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
 {initials(c.author_name)}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-baseline gap-2 flex-wrap">
 <span className="text-xs font-semibold">{c.author_name}</span>
 {c.is_question && (
 <Badge variant="outline"className="text-[9px] bg-amber-100 text-amber-700 border-amber-300 gap-0.5">
 <HelpCircle className="h-2.5 w-2.5"/> Question
 </Badge>
 )}
 {c.is_official_answer && (
 <Badge variant="outline"className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-300 gap-0.5">
 <CheckCircle2 className="h-2.5 w-2.5"/> Réponse officielle
 </Badge>
 )}
 <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
 <div className="ml-auto flex items-center gap-1">
 {c.user_id !== currentUserId && (
 <LearnerFollowButton userId={c.user_id} size="sm"variant="ghost"className="h-6 text-[10px] px-1.5 opacity-0 group-hover:opacity-100 transition"/>
 )}
 {(isStaff || c.user_id === currentUserId) && !c.is_question && (
 <button
 onClick={() => toggleOfficialAnswer(c.id, !!c.is_official_answer)}
 className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-700 hover:text-emerald-900 transition" title={c.is_official_answer ?"Retirer le marquage":"Marquer comme réponse officielle"}
 disabled={!isStaff}
 >
 <CheckCircle2 className="h-3.5 w-3.5"/>
 </button>
 )}
 {c.user_id === currentUserId && (
 <button onClick={() => remove(c.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-600 transition">
 <Trash2 className="h-3 w-3"/>
 </button>
 )}
 </div>
 </div>
 <div className="text-xs leading-relaxed mt-0.5">{renderBody(c.body, c.mentions || [])}</div>
 <div className="flex items-center gap-1 mt-1 flex-wrap">
 {Object.entries(reactions[c.id] || {}).map(([em, info]) => (
 <button
 key={em}
 onClick={() => toggleReaction(c.id, em)}
 className={`text-[11px] px-1.5 py-0.5 rounded-full border transition ${info.mine ?"bg-primary/10 border-primary/40 text-primary":"bg-muted/40 border-transparent hover:bg-muted"}`}
 >
 {em} {info.count}
 </button>
 ))}
 <Popover>
 <PopoverTrigger asChild>
 <button className="text-[11px] px-1 py-0.5 rounded-full text-muted-foreground hover:bg-muted/40">
 <SmilePlus className="h-3 w-3"/>
 </button>
 </PopoverTrigger>
 <PopoverContent align="start"className="w-auto p-1 flex gap-1">
 {EMOJIS.map(em => (
 <button
 key={em}
 onClick={() => toggleReaction(c.id, em)}
 className="text-base hover:scale-125 transition px-1" >
 {em}
 </button>
 ))}
 </PopoverContent>
 </Popover>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 <div className="mt-3 relative">
 <div className="flex items-center gap-2 mb-1.5">
 <span className="text-[10px] font-medium text-muted-foreground">Type :</span>
 <div className="inline-flex rounded-md border border-border overflow-hidden">
 <button
 type="button" onClick={() => setPostKind("comment")}
 className={`px-2 py-0.5 text-[10px] font-medium inline-flex items-center gap-1 ${postKind ==="comment"?"bg-primary text-primary-foreground":"bg-background text-muted-foreground hover:bg-muted"}`}
 >
 <MessageCircle className="h-3 w-3"/> Commentaire
 </button>
 <button
 type="button" onClick={() => setPostKind("question")}
 className={`px-2 py-0.5 text-[10px] font-medium inline-flex items-center gap-1 border-l ${postKind ==="question"?"bg-amber-500 text-white":"bg-background text-muted-foreground hover:bg-muted"}`}
 >
 <HelpCircle className="h-3 w-3"/> Question
 </button>
 </div>
 </div>
 <textarea
 ref={taRef}
 value={body}
 onChange={onChangeBody}
 placeholder={postKind ==="question"?"Posez votre question — les formateurs et co-apprenants pourront y répondre":"Écris un commentaire… utilise @ pour mentionner un co-apprenant"}
 className="w-full min-h-[70px] border rounded-md p-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" disabled={posting}
 />
 {mentionQuery !== null && filtered.length > 0 && (
 <div className="absolute z-10 bottom-full mb-1 left-2 bg-white border rounded-md shadow-lg max-h-56 overflow-y-auto min-w-[220px]">
 {filtered.map(u => (
 <button
 key={u.user_id}
 onClick={() => insertMention(u)}
 className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-primary/5 text-xs" >
 <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
 {initials(u.full_name)}
 </div>
 <span className="flex-1 truncate">{u.full_name}</span>
 <Badge variant="outline"className="text-[9px] capitalize">{u.role}</Badge>
 </button>
 ))}
 </div>
 )}
 <div className="flex items-center justify-between mt-2">
 <div className="text-[10px] text-muted-foreground flex items-center gap-1">
 <AtSign className="h-3 w-3"/>
 {Object.keys(selectedMentions).length > 0
 ? `${Object.keys(selectedMentions).length} mention(s)`
 :"Tapez @ pour mentionner"}
 </div>
 <Button size="sm"onClick={submit} disabled={posting || !body.trim()} className="bg-gradient-primary-deep text-primary-foreground h-7 text-xs">
 {posting ? <Loader2 className="h-3 w-3 animate-spin mr-1"/> : <Send className="h-3 w-3 mr-1"/>}
 {postKind ==="question"?"Publier la question":"Publier"}
 </Button>
 </div>
 </div>
 </div>
 </div>
 );
}
