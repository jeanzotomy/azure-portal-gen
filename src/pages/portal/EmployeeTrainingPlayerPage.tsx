import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrainingPageHero } from "@/components/training/TrainingPageHero";
import { TrainingPlayer } from "@/components/OnboardingTab";
import { useAuthSession } from "@/hooks/use-auth-session";

export default function EmployeeTrainingPlayerPage() {
  const { assignedId } = useParams<{ assignedId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [assigned, setAssigned] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!assignedId || !user) return;
    setLoading(true);
    const { data } = await supabase
      .from("onboarding_assigned_trainings")
      .select(
        "id, training_id, completed_at, quiz_score, quiz_passed, quiz_submitted_at, course_page, quiz_page, quiz_draft_answers, quiz_answers, process:onboarding_processes!inner(user_id), training:trainings(title, description, url, duration_minutes, category, content, quiz, passing_score)"
      )
      .eq("id", assignedId)
      .eq("process.user_id", user.id)
      .maybeSingle();
    setAssigned(data);
    setLoading(false);
  }, [assignedId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const onComplete = useCallback(async () => {
    if (!assignedId) return;
    await supabase
      .from("onboarding_assigned_trainings")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", assignedId)
      .is("completed_at", null);
    void load();
  }, [assignedId, load]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!assigned) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <Card className="p-8 text-center space-y-3">
          <h2 className="text-lg font-semibold">Formation introuvable</h2>
          <p className="text-sm text-muted-foreground">
            Cette formation n'existe pas ou ne vous est plus assignée.
          </p>
          <Button onClick={() => navigate("/portal/formations")}>Retour à mes formations</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <TrainingPageHero
        title={assigned.training?.title || "Formation"}
        subtitle={assigned.training?.description || undefined}
        icon={<GraduationCap className="h-6 w-6 text-white" />}
        backTo="/portal/formations"
        breadcrumbs={[
          { label: "Portail", to: "/portal" },
          { label: "Mes formations", to: "/portal/formations" },
          { label: assigned.training?.title || "Formation" },
        ]}
      />

      <TrainingPlayer assigned={assigned} userId={user.id} onComplete={onComplete} />
    </div>
  );
}
