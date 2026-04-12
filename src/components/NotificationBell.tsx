import { useEffect, useState, useCallback } from "react";
import { Bell, LifeBuoy, FolderOpen, MessageSquare, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useTranslation } from "@/i18n/LanguageContext";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
  id: string;
  type: "ticket_reply" | "ticket_status" | "project_update" | "contact_request";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

interface NotificationBellProps {
  /** "client" shows ticket replies & project updates; "admin" shows new tickets, contacts, unreplied */
  mode?: "client" | "admin";
  onNavigate?: (target: string) => void;
}

export function NotificationBell({ mode = "client", onNavigate }: NotificationBellProps) {
  const { user } = useAuthSession();
  const { locale } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const dateLocale = locale === "fr" ? fr : undefined;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const items: Notification[] = [];

    if (mode === "client") {
      // Ticket replies (admin replies on user's tickets)
      const { data: tickets } = await supabase
        .from("support_tickets")
        .select("id, subject, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(5);

      if (tickets) {
        for (const ticket of tickets) {
          const { data: replies } = await supabase
            .from("ticket_replies")
            .select("id, created_at, is_admin")
            .eq("ticket_id", ticket.id)
            .eq("is_admin", true)
            .order("created_at", { ascending: false })
            .limit(1);

          if (replies && replies.length > 0) {
            items.push({
              id: `reply-${replies[0].id}`,
              type: "ticket_reply",
              title: ticket.subject,
              description: locale === "fr" ? "Nouvelle réponse de l'équipe" : "New team reply",
              time: replies[0].created_at,
              read: false,
            });
          }
        }
      }

      // Project updates
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, status, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(5);

      if (projects) {
        projects.forEach((p) => {
          items.push({
            id: `project-${p.id}`,
            type: "project_update",
            title: p.name,
            description: locale === "fr" ? `Statut : ${p.status}` : `Status: ${p.status}`,
            time: p.updated_at,
            read: false,
          });
        });
      }
    }

    if (mode === "admin") {
      // Unreplied tickets
      const { data: tickets } = await supabase
        .from("support_tickets")
        .select("id, subject, status, created_at, ticket_number")
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (tickets) {
        for (const ticket of tickets) {
          const { count } = await supabase
            .from("ticket_replies")
            .select("id", { count: "exact", head: true })
            .eq("ticket_id", ticket.id)
            .eq("is_admin", true);

          if (count === 0) {
            items.push({
              id: `unreplied-${ticket.id}`,
              type: "ticket_reply",
              title: `${ticket.ticket_number || ""} ${ticket.subject}`.trim(),
              description: locale === "fr" ? "Ticket sans réponse" : "Unreplied ticket",
              time: ticket.created_at,
              read: false,
            });
          }
        }
      }

      // New contact requests
      const { data: contacts } = await supabase
        .from("contact_requests")
        .select("id, name, email, created_at, status")
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(5);

      if (contacts) {
        contacts.forEach((c) => {
          items.push({
            id: `contact-${c.id}`,
            type: "contact_request",
            title: c.name,
            description: c.email,
            time: c.created_at,
            read: false,
          });
        });
      }
    }

    // Sort by time descending
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setNotifications(items.slice(0, 10));
  }, [user, mode, locale]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Load read state from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("notif_read_ids");
      if (stored) setReadIds(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  const markAllRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
    try {
      sessionStorage.setItem("notif_read_ids", JSON.stringify([...allIds]));
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "ticket_reply": return <LifeBuoy size={14} className="text-primary shrink-0" />;
      case "ticket_status": return <CheckCircle2 size={14} className="text-accent shrink-0" />;
      case "project_update": return <FolderOpen size={14} className="text-primary shrink-0" />;
      case "contact_request": return <MessageSquare size={14} className="text-accent shrink-0" />;
    }
  };

  const handleClick = (notif: Notification) => {
    // Mark as read
    const newReadIds = new Set(readIds);
    newReadIds.add(notif.id);
    setReadIds(newReadIds);
    try {
      sessionStorage.setItem("notif_read_ids", JSON.stringify([...newReadIds]));
    } catch {}

    // Navigate
    if (onNavigate) {
      if (notif.type === "ticket_reply" || notif.type === "ticket_status") {
        onNavigate("tickets");
      } else if (notif.type === "project_update") {
        onNavigate("projects");
      } else if (notif.type === "contact_request") {
        onNavigate("contacts");
      }
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">
            {locale === "fr" ? "Notifications" : "Notifications"}
          </span>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              {locale === "fr" ? "Tout marquer lu" : "Mark all read"}
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell size={24} className="mb-2 opacity-40" />
              <span className="text-xs">{locale === "fr" ? "Aucune notification" : "No notifications"}</span>
            </div>
          ) : (
            notifications.map((notif) => {
              const isRead = readIds.has(notif.id);
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0 ${!isRead ? "bg-primary/5" : ""}`}
                >
                  <div className="mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!isRead ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{notif.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDistanceToNow(new Date(notif.time), { addSuffix: true, locale: dateLocale })}
                    </p>
                  </div>
                  {!isRead && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
