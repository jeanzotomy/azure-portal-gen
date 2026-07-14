import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  CheckCheck,
  Trash2,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Circle,
  ChevronLeft,
  ChevronRight,
  ArrowDownUp,
} from "lucide-react";
import { toast } from "sonner";

interface Notif {
  id: string;
  category: string;
  level: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  general: "Général",
  invoice: "Facturation",
  ticket: "Support",
  training: "Formation",
  system: "Système",
};

const LEVEL_CLS: Record<string, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "à l'instant";
  if (d < 3600) return `il y a ${Math.floor(d / 60)} min`;
  if (d < 86400) return `il y a ${Math.floor(d / 3600)} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short"
  });
};

type FilterMode = "all" | "unread" | "read";
type SortMode = "date_desc" | "date_asc" | "unread_first" | "read_first";

const PAGE_SIZE = 10;

export default function PortalNotificationsPage() {
  const { user } = useAuthSession();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("date_desc");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase.from("user_notifications") as any)
      .select("id, category, level, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Notif[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
    if (!user) return;
    const ch = supabase
      .channel(`notifs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, load]);

  useEffect(() => {
    setPage(1);
  }, [filter, sort]);

  const markRead = async (id: string) => {
    await (supabase.from("user_notifications") as any)
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
  };
  const markAll = async () => {
    const { data } = await (supabase.rpc as any)("mark_all_notifications_read");
    if (typeof data === "number") toast.success(`${data} notification(s) marquée(s) comme lues`);
  };
  const remove = async (id: string) => {
    await (supabase.from("user_notifications") as any).delete().eq("id", id);
  };

  const filtered = useMemo(() => {
    let arr = rows;
    if (filter === "unread") arr = arr.filter((r) => !r.read_at);
    else if (filter === "read") arr = arr.filter((r) => !!r.read_at);

    const byDateDesc = (a: Notif, b: Notif) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    const byDateAsc = (a: Notif, b: Notif) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

    const sorted = [...arr];
    if (sort === "date_desc") sorted.sort(byDateDesc);
    else if (sort === "date_asc") sorted.sort(byDateAsc);
    else if (sort === "unread_first")
      sorted.sort((a, b) => {
        const ua = a.read_at ? 1 : 0;
        const ub = b.read_at ? 1 : 0;
        if (ua !== ub) return ua - ub;
        return byDateDesc(a, b);
      });
    else if (sort === "read_first")
      sorted.sort((a, b) => {
        const ua = a.read_at ? 0 : 1;
        const ub = b.read_at ? 0 : 1;
        if (ua !== ub) return ua - ub;
        return byDateDesc(a, b);
      });
    return sorted;
  }, [rows, filter, sort]);

  const unreadCount = rows.filter((r) => !r.read_at).length;
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/portal")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Notifications
            </h1>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est à jour"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 text-xs ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-background"}`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 text-xs border-l ${filter === "unread" ? "bg-primary text-primary-foreground" : "bg-background"}`}
            >
              Non lues
            </button>
            <button
              onClick={() => setFilter("read")}
              className={`px-3 py-1 text-xs border-l ${filter === "read" ? "bg-primary text-primary-foreground" : "bg-background"}`}
            >
              Lues
            </button>
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
            <SelectTrigger className="h-8 w-[170px] text-xs">
              <ArrowDownUp className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Date (récent → ancien)</SelectItem>
              <SelectItem value="date_asc">Date (ancien → récent)</SelectItem>
              <SelectItem value="unread_first">Non lues d'abord</SelectItem>
              <SelectItem value="read_first">Lues d'abord</SelectItem>
            </SelectContent>
          </Select>
          {unreadCount > 0 && (
            <Button size="sm"
  variant="outline" onClick={markAll}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Tout marquer lu
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : visible.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto opacity-30 mb-2" />
              {filter === "unread"
                ? "Aucune notification non lue"
                : filter === "read"
                ? "Aucune notification lue"
                : "Aucune notification pour le moment"}
            </div>
          ) : (
            <ul className="divide-y">
              {visible.map((n) => (
                <li key={n.id} className={`p-3 sm:p-4 transition ${!n.read_at ? "bg-primary/5" : ""}`}>
                  <div className="flex items-start gap-3">
                    {!n.read_at && <Circle className="h-2 w-2 fill-primary text-primary mt-2 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{n.title}</span>
                        <Badge variant="outline"
  className={`text-[10px] ${LEVEL_CLS[n.level] ?? ""}`}>
                          {CATEGORY_LABEL[n.category] ?? n.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.body && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{n.body}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        {n.link && (
                          <Button
                            size="sm"
  variant="outline"
  className="h-7 text-xs"
                            onClick={() => {
                              if (!n.read_at) void markRead(n.id);
                              window.location.href = n.link!;
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" /> Ouvrir
                          </Button>
                        )}
                        {!n.read_at && (
                          <Button size="sm"
  variant="ghost"
  className="h-7 text-xs" onClick={() => void markRead(n.id)}>
                            <CheckCheck className="h-3 w-3 mr-1" /> Marquer lu
                          </Button>
                        )}
                        <Button
                          size="sm"
  variant="ghost"
  className="h-7 text-xs text-muted-foreground hover:text-rose-600 ml-auto"
                          onClick={() => void remove(n.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!loading && total > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, total)} sur {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
  variant="outline"
  className="h-8"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs px-2">
              Page {safePage} / {pageCount}
            </span>
            <Button
              size="sm"
  variant="outline"
  className="h-8"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
