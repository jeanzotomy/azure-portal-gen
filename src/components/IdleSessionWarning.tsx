import { useEffect, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

/**
 * Bandeau d'avertissement affiché 15 minutes avant la déconnexion automatique
 * (4 h d'inactivité). « Rester connecté » remet le compteur à zéro.
 */
export function IdleSessionWarning() {
  const { idleDeadline, stayConnected, signOutNow } = useAuthSession();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!idleDeadline) return;
    const t = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(t);
  }, [idleDeadline]);

  if (!idleDeadline) return null;

  const minutes = Math.max(1, Math.ceil((idleDeadline - now) / 60000));

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-warning/40 bg-card p-4 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-foreground">
            Inactivité prolongée : vous serez déconnecté dans environ {minutes} min.
          </p>
          <p className="text-xs text-muted-foreground">
            Vos saisies en cours sont sauvegardées et pourront être reprises.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={stayConnected}>Rester connecté</Button>
            <Button size="sm" variant="ghost" onClick={signOutNow}>Me déconnecter</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
