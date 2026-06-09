import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, GraduationCap, RefreshCw, Sparkles, BookOpen, Trophy, CheckCircle2 } from "lucide-react";
import { TrainingPlayer } from "@/components/OnboardingTab";
import { GamificationWidget } from "@/components/onboarding/GamificationWidget";
import { MentionsBell } from "@/components/onboarding/MentionsBell";
import type { User as SupaUser } from "@supabase/supabase-js";

type Assigned = {
  id: string;
  training_id: string;
  completed_at: string | null;
  quiz_score: number | null;
  quiz_passed: boolean | null;
  quiz_submitted_at: string | null;
  course_page: number;
  quiz_page: number;
  quiz_draft_answers: any;
  quiz_answers: any;
  training: {
    title: string;
    description: string | null;
    url: string | null;
    duration_minutes: number | null;
    category: string | null;
    content: any | null;
    quiz: any | null;
    passing_score: number;
  } | null;
};

export default function EmployeeTrainingsTab({ user }: { user: SupaUser }) {
  const [loading, setLoading] = useState(true);
  const [processId, setProcessId] = useState<string | null>(null);
  const [trainings, setTrainings] = useState<Assigned[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: proc } = await supabase
      .from("onboarding_processes")
      .select("id")
      .eq("user_id", user.id)
      .eq("kind", "employee_training")
      .maybeSingle();

    if (!proc) {
      setProcessId(null);
      setTrainings([]);
      setLoading(false);
      return;
    }

    setProcessId(proc.id);
    const { data } = await supabase
      .from("onboarding_assigned_trainings")
      .select(
        "id, training_id, completed_at, quiz_score, quiz_passed, quiz_submitted_at, course_page, quiz_page, quiz_draft_answers, quiz_answers, training:trainings(title, description, url, duration_minutes, category, content, quiz, passing_score)"
      )
      .eq("process_id", proc.id)
      .order("assigned_at", { ascending: false });

    setTrainings((data || []) as any);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onComplete = useCallback(
    async (assignedId: string) => {
      await supabase
        .from("onboarding_assigned_trainings")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", assignedId)
        .is("completed_at", null);
      setRefreshKey((k) => k + 1);
      void load();
    },
    [load]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const completed = trainings.filter((t) => t.completed_at).length;
  const passed = trainings.filter((t) => t.quiz_passed).length;
  const total = trainings.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-[#007aa3] text-white p-6 shadow-md">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-cyan-100 text-sm mb-2">
              <Sparkles className="h-4 w-4" /> Formation continue
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Mes formations</h1>
            <p className="text-cyan-50 text-sm">
              Modules assignés par votre RH ou administrateur pour votre développement professionnel.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MentionsBell userId={user.id} />
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              className="bg-white/10 text-white border-white/30 hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
            </Button>
          </div>
        </div>

        {total > 0 && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 max-w-md mt-5">
            <div className="flex justify-between text-sm mb-2">
              <span>Progression globale</span>
              <span className="font-bold">
                {completed}/{total} formations
              </span>
            </div>
            <Progress value={pct} className="h-2 bg-white/20" />
          </div>
        )}
      </div>

      {/* Stats */}
      {total > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatChip icon={BookOpen} label="Assignées" value={total} color="bg-primary/10 text-primary" />
          <StatChip
            icon={CheckCircle2}
            label="Complétées"
            value={completed}
            color="bg-emerald-500/10 text-emerald-600"
          />
          <StatChip
            icon={Trophy}
            label="QCM réussis"
            value={passed}
            color="bg-amber-500/10 text-amber-600"
          />
        </div>
      )}

      {/* Gamification */}
      <GamificationWidget userId={user.id} refreshKey={refreshKey} />

      {/* List or empty */}
      {trainings.length === 0 ? (
        <Card className="max-w-xl mx-auto p-8 text-center space-y-3">
          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">Aucune formation pour le moment</h2>
          <p className="text-sm text-muted-foreground">
            Votre RH ou un administrateur pourra vous assigner des formations continues. Elles
            apparaîtront ici dès qu'elles seront prêtes.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {trainings.map((t) => (
            <div key={t.id} className="relative">
              <Badge className="absolute -top-2 left-3 z-10 bg-primary text-white text-[10px]">
                Formation continue
              </Badge>
              <TrainingPlayer assigned={t} userId={user.id} onComplete={() => onComplete(t.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </Card>
  );
}
