import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, RefreshCw, Search, Inbox } from "lucide-react";
import { format } from "date-fns";
import SendDirectEmailDialog from "@/components/admin/SendDirectEmailDialog";

type AppStatus = "nouvelle" | "en_revue" | "entretien" | "acceptee" | "refusee";

interface Row {
  id: string;
  job_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: AppStatus;
  created_at: string;
  tracking_id: string | null;
}

const STATUS: Record<AppStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  nouvelle: { label: "Reçue", variant: "secondary" },
  en_revue: { label: "En revue", variant: "outline" },
  entretien: { label: "Entretien", variant: "default" },
  acceptee: { label: "Acceptée", variant: "default" },
  refusee: { label: "Refusée", variant: "destructive" },
};

export default function HrApplicationsList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [jobs, setJobs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [job, setJob] = useState("all");
  const [target, setTarget] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    const [a, j] = await Promise.all([
      supabase
        .from("job_applications")
        .select("id, job_id, full_name, email, phone, status, created_at, tracking_id")
        .order("created_at", { ascending: false }),
      supabase.from("job_postings").select("id, title"),
    ]);
    setRows((a.data || []) as Row[]);
    setJobs(Object.fromEntries((j.data || []).map((x: { id: string; title: string }) => [x.id, x.title])));
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (job === "all" || r.job_id === job) &&
        (!q || r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)),
    );
  }, [rows, search, status, job]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Candidatures reçues</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} candidature(s) sur {rows.length}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} className={`mr-2 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Nom ou email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={job} onValueChange={setJob}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Offre" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les offres</SelectItem>
            {Object.entries(jobs).map(([id, t]) => (
              <SelectItem key={id} value={id}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Réponse" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les réponses</SelectItem>
            {(Object.keys(STATUS) as AppStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!loading && filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <Inbox className="mx-auto mb-2" /> Aucune candidature.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="p-3">Candidat</th>
                  <th className="p-3">Offre</th>
                  <th className="p-3">Reçue le</th>
                  <th className="p-3">Réponse</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="p-3">{jobs[r.job_id] || "Offre supprimée"}</td>
                    <td className="p-3 whitespace-nowrap">{format(new Date(r.created_at), "dd/MM/yyyy")}</td>
                    <td className="p-3"><Badge variant={STATUS[r.status]?.variant}>{STATUS[r.status]?.label || r.status}</Badge></td>
                    <td className="p-3 text-right">
                      <Button size="sm" onClick={() => setTarget(r)}>
                        <Mail size={14} className="mr-1.5" /> Envoyer un message
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {target && (
        <SendDirectEmailDialog
          open={!!target}
          onOpenChange={(v) => !v && setTarget(null)}
          recipientEmail={target.email}
          recipientName={target.full_name}
        />
      )}
    </div>
  );
}
