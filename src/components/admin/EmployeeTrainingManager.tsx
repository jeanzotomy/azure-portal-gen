import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  Plus,
  Trash2,
  GraduationCap,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  Award,
  BookOpen,
  RefreshCw,
} from "lucide-react";

type UserRow = {
  user_id: string;
  full_name: string;
  email: string;
  total_assigned: number;
  total_completed: number;
  process_id: string | null;
};

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

export default function EmployeeTrainingManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [assigned, setAssigned] = useState<AssignedRow[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "with" | "without">("all");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalog, setCatalog] = useState<Training[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase.rpc("list_employee_assignable_users");
    if (error) {
      toast.error(error.message);
    } else {
      setUsers((data || []) as UserRow[]);
    }
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const loadAssigned = useCallback(async (userId: string) => {
    setLoadingAssigned(true);
    const { data, error } = await supabase.rpc("list_employee_trainings_for_user", {
      _user_id: userId,
    });
    if (error) {
      toast.error(error.message);
      setAssigned([]);
    } else {
      setAssigned((data || []) as AssignedRow[]);
    }
    setLoadingAssigned(false);
  }, []);

  useEffect(() => {
    if (selected) void loadAssigned(selected.user_id);
    else setAssigned([]);
  }, [selected, loadAssigned]);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    const { data } = await supabase
      .from("trainings")
      .select("id, title, category, duration_minutes, active")
      .eq("active", true)
      .order("title");
    setCatalog((data || []) as Training[]);
    setLoadingCatalog(false);
  }, []);

  const openCatalog = () => {
    setCatalogOpen(true);
    if (catalog.length === 0) void loadCatalog();
  };

  const assignTraining = async (trainingId: string) => {
    if (!selected) return;
    setBusy(trainingId);
    const { error } = await supabase.rpc("assign_employee_training", {
      _user_id: selected.user_id,
      _training_id: trainingId,
    });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Formation assignée");
    await loadAssigned(selected.user_id);
    await loadUsers();
  };

  const unassignTraining = async (trainingId: string) => {
    if (!selected) return;
    setBusy(trainingId);
    const { data, error } = await supabase.rpc("unassign_employee_training", {
      _user_id: selected.user_id,
      _training_id: trainingId,
    });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data === false) {
      toast.warning("Impossible de retirer : la formation est déjà complétée.");
    } else {
      toast.success("Formation retirée");
    }
    await loadAssigned(selected.user_id);
    await loadUsers();
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "with" && u.total_assigned === 0) return false;
      if (filter === "without" && u.total_assigned > 0) return false;
      if (!q) return true;
      return (
        u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    });
  }, [users, search, filter]);

  const assignedIds = useMemo(() => new Set(assigned.map((a) => a.training_id)), [assigned]);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return catalog.filter(
      (c) =>
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.category || "").toLowerCase().includes(q)
    );
  }, [catalog, catalogSearch]);

  // KPIs
  const kpis = useMemo(() => {
    const usersWith = users.filter((u) => u.total_assigned > 0).length;
    const totalAssignments = users.reduce((s, u) => s + u.total_assigned, 0);
    const totalCompleted = users.reduce((s, u) => s + u.total_completed, 0);
    const rate = totalAssignments > 0 ? Math.round((totalCompleted / totalAssignments) * 100) : 0;
    return { usersWith, totalAssignments, totalCompleted, rate };
  }, [users]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Users} label="Utilisateurs avec formation" value={kpis.usersWith} color="bg-primary/10 text-primary" />
        <Kpi icon={BookOpen} label="Assignations totales" value={kpis.totalAssignments} color="bg-cyan-500/10 text-cyan-600" />
        <Kpi icon={CheckCircle2} label="Complétées" value={kpis.totalCompleted} color="bg-emerald-500/10 text-emerald-600" />
        <Kpi icon={TrendingUp} label="Taux de complétion" value={`${kpis.rate}%`} color="bg-amber-500/10 text-amber-600" />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" /> Formations employés
          </h2>
          <Button size="sm" variant="outline" onClick={loadUsers}>
            <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Users list */}
          <div className="lg:col-span-1 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="all" className="text-xs">Tous</TabsTrigger>
                <TabsTrigger value="with" className="text-xs">Avec formations</TabsTrigger>
                <TabsTrigger value="without" className="text-xs">Sans</TabsTrigger>
              </TabsList>
            </Tabs>

            <ScrollArea className="h-[440px] rounded-md border">
              {loadingUsers ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Aucun utilisateur correspondant.
                </div>
              ) : (
                <ul className="divide-y">
                  {filteredUsers.map((u) => (
                    <li key={u.user_id}>
                      <button
                        onClick={() => setSelected(u)}
                        className={`w-full text-left p-3 hover:bg-accent/40 transition ${
                          selected?.user_id === u.user_id ? "bg-primary/10" : ""
                        }`}
                      >
                        <div className="font-medium text-sm truncate">{u.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                        <div className="mt-1 flex items-center gap-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {u.total_assigned} assignée{u.total_assigned > 1 ? "s" : ""}
                          </Badge>
                          {u.total_completed > 0 && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 text-[10px]">
                              {u.total_completed} complétée{u.total_completed > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-2">
            {!selected ? (
              <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                Sélectionnez un utilisateur pour gérer ses formations continues.
              </Card>
            ) : (
              <Card className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-semibold">{selected.full_name}</div>
                    <div className="text-xs text-muted-foreground">{selected.email}</div>
                  </div>
                  <Button size="sm" onClick={openCatalog} className="bg-gradient-to-r from-primary to-[#007aa3] text-white">
                    <Plus className="h-4 w-4 mr-1" /> Assigner une formation
                  </Button>
                </div>

                {loadingAssigned ? (
                  <div className="py-10 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : assigned.length === 0 ? (
                  <div className="p-6 border-dashed border rounded-md text-center text-sm text-muted-foreground">
                    Aucune formation continue assignée à cet utilisateur.
                  </div>
                ) : (
                  <ul className="divide-y border rounded-md">
                    {assigned.map((a) => {
                      const done = !!a.completed_at;
                      return (
                        <li
                          key={a.assigned_id}
                          className="p-3 flex items-center justify-between gap-3 flex-wrap"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate flex items-center gap-2">
                              {a.title}
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
                )}
              </Card>
            )}
          </div>
        </div>
      </Card>

      {/* Catalog dialog */}
      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="-mx-6 -mt-6 mb-2 px-6 pt-6 pb-4 bg-gradient-to-r from-primary to-[#007aa3] rounded-t-lg text-white">
            <DialogTitle className="text-white">Assigner une formation</DialogTitle>
            <DialogDescription className="text-white/80">
              Choisissez une formation active du catalogue à assigner à {selected?.full_name}.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans le catalogue…"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <ScrollArea className="h-[420px] rounded-md border">
            {loadingCatalog ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Aucune formation correspondante.
              </div>
            ) : (
              <ul className="divide-y">
                {filteredCatalog.map((t) => {
                  const already = assignedIds.has(t.id);
                  return (
                    <li
                      key={t.id}
                      className="p-3 flex items-center justify-between gap-3 flex-wrap"
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
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <Card className="p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </Card>
  );
}
