import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthSession } from "@/hooks/use-auth-session";

interface Props {
  userId: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function LearnerFollowButton({ userId, size = "sm", variant = "outline", className }: Props) {
  const { user } = useAuthSession();
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user || user.id === userId) {
      setIsFollowing(false);
      return;
    }
    void (async () => {
      const { data } = await (supabase.from("learner_follows") as any)
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("followee_id", userId)
        .maybeSingle();
      if (!cancelled) setIsFollowing(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, userId]);

  if (!user || user.id === userId) return null;

  const toggle = async () => {
    setBusy(true);
    const { data, error } = await (supabase.rpc as any)("toggle_learner_follow", { _followee: userId });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setIsFollowing(!!data);
    toast.success(data ? "Apprenant suivi" : "Vous ne suivez plus cet apprenant");
  };

  return (
    <Button
      size={size}
      variant={isFollowing ? "secondary" : variant}
      onClick={toggle}
      disabled={busy || isFollowing === null}
      className={className}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="h-3.5 w-3.5 mr-1" /> Suivi
        </>
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5 mr-1" /> Suivre
        </>
      )}
    </Button>
  );
}
