import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Search, Loader2, RefreshCw } from "lucide-react";

interface AuditRow {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  payload: any;
  created_at: string;
}

export function AdminAuditLogCard() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("admin_audit_log") as any)
      .select("id, actor_email, action, target_type, target_id, payload, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as AuditRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return (
      r.action.toLowerCase().includes(t) ||
      (r.actor_email ?? "").toLowerCase().includes(t) ||
      (r.target_type ?? "").toLowerCase().includes(t) ||
      (r.target_id ?? "").toLowerCase().includes(t)
    );
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" /> Journal d'audit administrateur
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer par action, email, cible…" className="pl-9 h-9" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-xs text-center text-muted-foreground">
            {q ? "Aucune action ne correspond à votre recherche." : "Aucune action enregistrée. Les actions sensibles apparaîtront ici."}
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <ul className="divide-y">
              {filtered.map((r) => (
                <li key={r.id} className="px-3 py-2.5 text-xs hover:bg-muted/40">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-mono">{r.action}</Badge>
                    {r.target_type && (
                      <span className="text-muted-foreground">
                        → <span className="font-medium">{r.target_type}</span>
                        {r.target_id && <span className="text-muted-foreground/70 ml-1 font-mono">{r.target_id.slice(0, 12)}</span>}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    par <span className="font-medium">{r.actor_email ?? "système"}</span>
                  </div>
                  {r.payload && Object.keys(r.payload).length > 0 && (
                    <pre className="mt-1 text-[10px] bg-muted/40 rounded p-1.5 overflow-x-auto font-mono">
                      {JSON.stringify(r.payload, null, 0)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminAuditLogCard;
