import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TrainingPageHero } from "@/components/training/TrainingPageHero";
import { TrainingStatsGrid } from "@/components/training/TrainingStatsGrid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  Plus,
  Trash2,
  GraduationCap,
  CheckCircle2,
  Clock,
  Award,
  BookOpen,
  RefreshCw,
  Mail,
  User,
} from "lucide-react";
import SendDirectEmailDialog from "@/components/admin/SendDirectEmailDialog";

type AssignedRow = {
  assigned_id: string;
  training_id: string;
  title: string;
  category: string | null;
  duration_minutes: number | null;
  assigned_at: string;
  completed_at: string | null;
  quiz_score: number | null;
  quiz_passed: boolean | null;
  source: string;
};

type Training = {
  id: string;
  title: string;
  category: string | null;
  duration_minutes: number | null;
  active: boolean;
};

type UserMeta = {
  user_id: string;
  full_name: string;
  email: string;
};

interface Props {
  /** Route base used to compute backTo and breadcrumb links. */
  basePath?: string; // e.g. "/admin/formations" or "/rh/formations"
  /** Human breadcrumb label for the parent screen. */
  parentLabel?: string;
}

/**
 * Dedicated page for managing one user's continuous (employee) training
 * assignments. Replaces the previous modal-in-tab flow.
 */
export default function EmployeeTrainingAssignmentPage({
  basePath = "/admin/formations",
  parentLabel = "Formations",
}: Props) {
  const { userId = "" } = useParams<{ userId: string }>();
  
  const [user, setUser] = useState<UserMeta | null>(null);
  const [assigned, setAssigned] = useState<AssignedRow[]>([]);
  const [catalog, setCatalog] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"assigned" | "catalog">("assigned");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);

  const loadAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [usersRes, assignedRes, catalogRes] = await Promise.all([
      supabase.rpc("list_employee_assignable_users"),
      supabase.rpc("list_employee_trainings_for_user", { _user_id: userId }),
      supabase.from("trainings").select("id, title, category, duration_minutes, active").eq("active", true).order("title"),
    ]);

    const found = (usersRes.data as Array<{ user_id: string; full_name: string; email: string }> | null)?.find(
      (u) => u.user_id === userId
    );
    if (found) setUser({ user_id: found.user_id, full_name: found.full_name, email: found.email });
    if (assignedRes.error) toast.error(assignedRes.error.message);
    else setAssigned((assignedRes.data || []) as AssignedRow[]);
    setCatalog((catalogRes.data || []) as Training[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const assignedIds = useMemo(() => new Set(assigned.map((a) => a.training_id)), [assigned]);

  const assignTraining = async (trainingId: string) => {
    setBusy(trainingId);
    const { error } = await supabase.rpc("assign_employee_training", {
      _user_id: userId,
      _training_id: trainingId,
    });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Formation assignée");
    await loadAll();
  };

  const unassignTraining = async (trainingId: string) => {
    setBusy(trainingId);
    const { data, error } = await supabase.rpc("unassign_employee_training", {
      _user_id: userId,
      _training_id: trainingId,
    });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data === false) {
      toast.warning("Impossible de retirer : déjà complétée.");
    } else {
      toast.success("Formation retirée");
    }
    await loadAll();
  };

  const stats = useMemo(() => {
    const total = assigned.length;
    const done = assigned.filter((a) => a.completed_at).length;
    const inProgress = total - done;
    const avg = (() => {
      const scored = assigned.filter((a) => a.quiz_score != null);
      if (!scored.length) return "—";
      return `${Math.round(scored.reduce((s, a) => s + (a.quiz_score || 0), 0) / scored.length)}%`;
    })();
    return [
      { icon: BookOpen, label: "Assignées", value: total, accent: "cyan" as const },
      { icon: Clock, label: "En cours", value: inProgress, accent: "amber" as const },
      { icon: CheckCircle2, label: "Complétées", value: done, accent: "emerald" as const },
      { icon: Award, label: "Score moyen", value: avg, accent: "violet" as const },
    ];
  }, [assigned]);

  const filteredAssigned = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assigned;
    return assigned.filter(
      (a) => a.title.toLowerCase().includes(q) || (a.category || "").toLowerCase().includes(q)
    );
  }, [assigned, search]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter(
      (c) =>
        !q || c.title.toLowerCase().includes(q) || (c.category || "").toLowerCase().includes(q)
    );
  }, [catalog, search]);

  return (
    <div className="space-y-4 p-3 md:p-5 max-w-6xl mx-auto">
      <TrainingPageHero
        icon={<GraduationCap className="h-6 w-6" />}
        title={user?.full_name || "Formations de l'utilisateur"}
        subtitle={user?.email}
        backTo={basePath}
        breadcrumbs={[
          { label: parentLabel, to: basePath },
          { label: "Assignations" },
          { label: user?.full_name || "…" },
        ]}
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={loadAll}
            className="bg-white/15 hover:bg-white/25 text-white border-white/20"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
          </Button>
        }
      />

      {user && (
        <Card className="p-3 flex items-center gap-3 flex-wrap">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{user.full_name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> {user.email}
            </div>
          </div>
        </Card>
      )}

      <TrainingStatsGrid stats={stats} />

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as "assigned" | "catalog")}>
            <TabsList>
              <TabsTrigger value="assigned" className="gap-2">
                <BookOpen className="h-4 w-4" /> Assignées ({assigned.length})
              </TabsTrigger>
              <TabsTrigger value="catalog" className="gap-2">
                <Plus className="h-4 w-4" /> Catalogue ({catalog.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            size="sm"
            variant="outline"
            disabled={!user}
            onClick={() => setEmailOpen(true)}
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Mail className="h-4 w-4" /> Écrire un email
          </Button>


          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filter === "assigned" ? (
          filteredAssigned.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Aucune formation continue assignée"
              hint="Bascule vers le catalogue pour en assigner."
              action={
                <Button size="sm" onClick={() => setFilter("catalog")}>
                  <Plus className="h-4 w-4 mr-1" /> Voir le catalogue
                </Button>
              }
            />
          ) : (
            <ul className="divide-y border rounded-lg overflow-hidden">
              {filteredAssigned.map((a) => {
                const done = !!a.completed_at;
                return (
                  <li
                    key={a.assigned_id}
                    className="p-3 flex items-center justify-between gap-3 flex-wrap hover:bg-accent/30 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                        <span className="truncate">{a.title}</span>
                        {done ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Complétée
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            <Clock className="h-3 w-3 mr-1" /> En cours
                          </Badge>
                        )}
                        {a.quiz_passed && a.quiz_score != null && (
                          <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 text-[10px]">
                            <Award className="h-3 w-3 mr-1" /> {a.quiz_score}%
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {a.category && <>Catégorie : {a.category} · </>}
                        Assignée le {new Date(a.assigned_at).toLocaleDateString("fr-FR")}
                        {a.completed_at && (
                          <> · Complétée le {new Date(a.completed_at).toLocaleDateString("fr-FR")}</>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={done || busy === a.training_id}
                      onClick={() => unassignTraining(a.training_id)}
                      className="text-destructive hover:text-destructive disabled:opacity-30"
                      title={done ? "Impossible : déjà complétée" : "Retirer"}
                    >
                      {busy === a.training_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )
        ) : filteredCatalog.length === 0 ? (
          <EmptyState icon={BookOpen} title="Aucune formation correspondante" />
        ) : (
          <ul className="divide-y border rounded-lg overflow-hidden">
            {filteredCatalog.map((t) => {
              const already = assignedIds.has(t.id);
              return (
                <li
                  key={t.id}
                  className="p-3 flex items-center justify-between gap-3 flex-wrap hover:bg-accent/30 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{t.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {t.category && <>Catégorie : {t.category}</>}
                      {t.duration_minutes != null && <> · {t.duration_minutes} min</>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={already || busy === t.id}
                    onClick={() => assignTraining(t.id)}
                    variant={already ? "outline" : "default"}
                    className={!already ? "bg-gradient-primary-deep text-primary-foreground" : ""}
                  >
                    {busy === t.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : already ? (
                      "Déjà assignée"
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" /> Assigner
                      </>
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {user && (
        <SendDirectEmailDialog
          open={emailOpen}
          onOpenChange={setEmailOpen}
          recipientEmail={user.email}
          recipientName={user.full_name}
          recipientUserId={user.user_id}
        />
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: typeof BookOpen;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-12 border border-dashed rounded-lg text-center text-sm text-muted-foreground space-y-2">
      <Icon className="h-10 w-10 mx-auto opacity-40" />
      <div className="font-medium">{title}</div>
      {hint && <div className="text-xs">{hint}</div>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
