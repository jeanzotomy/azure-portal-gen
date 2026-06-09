import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  GraduationCap,
  RefreshCw,
  BookOpen,
  Trophy,
  CheckCircle2,
  PlayCircle,
  Clock,
  ArrowLeft,
  Search,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { TrainingPageHero } from "@/components/training/TrainingPageHero";
import { TrainingStatsGrid } from "@/components/training/TrainingStatsGrid";
import { GamificationWidget } from "@/components/onboarding/GamificationWidget";
import { MentionsBell } from "@/components/onboarding/MentionsBell";
import { useAuthSession } from "@/hooks/use-auth-session";

type Assigned = {
  id: string;
  training_id: string;
  completed_at: string | null;
  quiz_score: number | null;
  quiz_passed: boolean | null;
  course_page: number;
  training: {
    title: string;
    description: string | null;
    duration_minutes: number | null;
    category: string | null;
    content: any | null;
    quiz: any | null;
  } | null;
};

export default function EmployeeTrainingsListPage() {
  const { user } = useAuthSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trainings, setTrainings] = useState<Assigned[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "not_started" | "in_progress" | "completed" | "quiz_passed">("all");
  const [progressFilter, setProgressFilter] = useState<"all" | "0-25" | "25-50" | "50-75" | "75-100">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // 1. Search by user_id first
    let { data: proc } = await supabase
      .from("onboarding_processes")
      .select("id")
      .eq("user_id", user.id)
      .eq("kind", "employee_training")
      .maybeSingle();

    // 2. Fallback: search by email (case-insensitive) when process was created before signup
    if (!proc && user.email) {
      const { data: byEmail } = await supabase
        .from("onboarding_processes")
        .select("id, user_id")
        .ilike("candidate_email", user.email)
        .eq("kind", "employee_training")
        .is("user_id", null)
        .maybeSingle();
      if (byEmail) {
        // Link the process to the current user for future lookups
        await supabase
          .from("onboarding_processes")
          .update({ user_id: user.id })
          .eq("id", byEmail.id);
        proc = { id: byEmail.id };
      }
    }

    if (!proc) {
      setTrainings([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("onboarding_assigned_trainings")
      .select(
        "id, training_id, completed_at, quiz_score, quiz_passed, course_page, training:trainings(title, description, duration_minutes, category, content, quiz)"
      )
      .eq("process_id", proc.id)
      .order("assigned_at", { ascending: false });

    setTrainings((data || []) as any);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    trainings.forEach((t) => t.training?.category && set.add(t.training.category));
    return Array.from(set).sort();
  }, [trainings]);

  const getProgressPct = (t: Assigned) => {
    const totalPages = Array.isArray(t.training?.content) ? t.training!.content.length : 0;
    return totalPages > 0 ? Math.min(100, Math.round(((t.course_page || 0) / totalPages) * 100)) : 0;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trainings.filter((t) => {
      if (q) {
        const hay = `${t.training?.title || ""} ${t.training?.description || ""} ${t.training?.category || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "all") {
        const isCompleted = !!t.completed_at;
        const started = (t.course_page || 0) > 0;
        if (statusFilter === "completed" && !isCompleted) return false;
        if (statusFilter === "in_progress" && (isCompleted || !started)) return false;
        if (statusFilter === "not_started" && (isCompleted || started)) return false;
        if (statusFilter === "quiz_passed" && !t.quiz_passed) return false;
      }
      if (progressFilter !== "all") {
        const p = getProgressPct(t);
        const [min, max] = progressFilter.split("-").map(Number);
        if (p < min || p > max) return false;
      }
      if (categoryFilter !== "all" && t.training?.category !== categoryFilter) return false;
      return true;
    });
  }, [trainings, search, statusFilter, progressFilter, categoryFilter]);

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const total = trainings.length;
  const completed = trainings.filter((t) => t.completed_at).length;
  const inProgress = trainings.filter((t) => !t.completed_at && (t.course_page > 0)).length;
  const passed = trainings.filter((t) => t.quiz_passed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    progressFilter !== "all" ||
    categoryFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setProgressFilter("all");
    setCategoryFilter("all");
  };

  return (
    <div className="space-y-6">
        <TrainingPageHero
          title="Mes formations"
          subtitle="Modules continus assignés par votre RH ou administrateur — suivez votre progression et obtenez vos certificats."
          icon={<GraduationCap className="h-6 w-6 text-white" />}
          backTo="/portal"
          breadcrumbs={[
            { label: "Portail", to: "/portal" },
            { label: "Mes formations" },
          ]}
          actions={
            <>
              <MentionsBell userId={user.id} />
              <Button
                size="sm"
                variant="outline"
                onClick={load}
                className="bg-white/10 text-white border-white/30 hover:bg-white/20"
              >
                <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
              </Button>
            </>
          }
        />

        {total > 0 && (
          <>
            <TrainingStatsGrid
              stats={[
                { icon: BookOpen, label: "Assignées", value: total, accent: "primary" },
                { icon: PlayCircle, label: "En cours", value: inProgress, accent: "cyan" },
                { icon: CheckCircle2, label: "Complétées", value: completed, accent: "emerald" },
                { icon: Trophy, label: "QCM réussis", value: passed, accent: "amber" },
              ]}
            />

            <Card className="p-4 bg-card/60 backdrop-blur border-border/60">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">Progression globale</span>
                <span className="text-muted-foreground">
                  {completed}/{total} formations · {pct}%
                </span>
              </div>
              <Progress value={pct} className="h-2" />
            </Card>
          </>
        )}

        <GamificationWidget userId={user.id} refreshKey={completed} />

        {trainings.length === 0 ? (
          <Card className="max-w-xl mx-auto p-10 text-center space-y-3">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/60" />
            <h2 className="text-lg font-semibold">Aucune formation pour le moment</h2>
            <p className="text-sm text-muted-foreground">
              Votre RH ou un administrateur pourra vous assigner des formations continues. Elles
              apparaîtront ici dès qu'elles seront prêtes.
            </p>
            <Button variant="outline" onClick={() => navigate("/portal")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour au portail
            </Button>
          </Card>
        ) : (
          <>
            <Card className="p-3 bg-card/60 backdrop-blur border-border/60">
              <div className="flex flex-col lg:flex-row lg:items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher par titre, description, catégorie..."
                    className="pl-9 pr-9 h-9"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Effacer la recherche"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:flex lg:items-center">
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                    <SelectTrigger className="h-9 w-full lg:w-[150px]">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous statuts</SelectItem>
                      <SelectItem value="not_started">Non démarrées</SelectItem>
                      <SelectItem value="in_progress">En cours</SelectItem>
                      <SelectItem value="completed">Complétées</SelectItem>
                      <SelectItem value="quiz_passed">QCM réussi</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={progressFilter} onValueChange={(v) => setProgressFilter(v as typeof progressFilter)}>
                    <SelectTrigger className="h-9 w-full lg:w-[150px]">
                      <SelectValue placeholder="Progression" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toute progression</SelectItem>
                      <SelectItem value="0-25">0 – 25 %</SelectItem>
                      <SelectItem value="25-50">25 – 50 %</SelectItem>
                      <SelectItem value="50-75">50 – 75 %</SelectItem>
                      <SelectItem value="75-100">75 – 100 %</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-9 w-full lg:w-[170px]">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes catégories</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="h-9 shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" /> Réinitialiser
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <SlidersHorizontal className="h-3 w-3" />
                <span>
                  {filtered.length} / {total} formation{total > 1 ? "s" : ""}
                  {hasActiveFilters ? " (filtrées)" : ""}
                </span>
              </div>
            </Card>

            {filtered.length === 0 ? (
              <Card className="p-10 text-center space-y-3">
                <Search className="h-10 w-10 mx-auto text-muted-foreground/60" />
                <h3 className="font-semibold">Aucun résultat</h3>
                <p className="text-sm text-muted-foreground">
                  Aucune formation ne correspond à vos critères de recherche.
                </p>
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((t) => (
                  <TrainingListCard
                    key={t.id}
                    assigned={t}
                    onOpen={() => navigate(`/portal/formations/${t.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
    </div>
  );
}

function TrainingListCard({
  assigned,
  onOpen,
}: {
  assigned: Assigned;
  onOpen: () => void;
}) {
  const t = assigned.training;
  if (!t) return null;
  const totalPages = Array.isArray(t.content) ? t.content.length : 0;
  const progressPct =
    totalPages > 0 ? Math.min(100, Math.round(((assigned.course_page || 0) / totalPages) * 100)) : 0;
  const isCompleted = !!assigned.completed_at;
  const isStarted = (assigned.course_page || 0) > 0;

  return (
    <Card className="group relative overflow-hidden border-border/60 bg-card/70 backdrop-blur hover:border-primary/40 hover:shadow-lg transition flex flex-col">
      <div className="h-1.5 bg-gradient-to-r from-primary to-[#007aa3]" />
      <div className="p-5 flex flex-col flex-1 gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {t.category && (
              <Badge variant="outline" className="mb-2 text-[10px] font-normal">
                {t.category}
              </Badge>
            )}
            <h3 className="font-semibold text-base leading-tight line-clamp-2">{t.title}</h3>
          </div>
          {isCompleted && (
            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 shrink-0">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Terminé
            </Badge>
          )}
        </div>

        {t.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
        )}

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-auto">
          {t.duration_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {t.duration_minutes} min
            </span>
          )}
          {totalPages > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> {totalPages} pages
            </span>
          )}
          {assigned.quiz_passed && (
            <span className="flex items-center gap-1 text-amber-600">
              <Trophy className="h-3 w-3" /> {assigned.quiz_score}%
            </span>
          )}
        </div>

        {totalPages > 0 && (
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Progression</span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        )}

        <Button onClick={onOpen} size="sm" className="w-full mt-1">
          <PlayCircle className="h-4 w-4 mr-1" />
          {isCompleted ? "Revoir" : isStarted ? "Continuer" : "Commencer"}
        </Button>
      </div>
    </Card>
  );
}
