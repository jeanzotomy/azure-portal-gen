import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmState {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "primary";
  onConfirm: () => void | Promise<void>;
}

/**
 * useConfirm — imperative replacement for window.confirm() with glass styling.
 *
 *   const { confirm, dialog } = useConfirm();
 *   ...
 *   confirm({ title: "Supprimer ?", variant: "destructive", onConfirm: () => doDelete() });
 *   ...
 *   return (<>... {dialog}</>);
 */
export function useConfirm() {
  const [state, setState] = React.useState<ConfirmState | null>(null);
  const [busy, setBusy] = React.useState(false);

  const confirm = React.useCallback((s: ConfirmState) => setState(s), []);

  const handleConfirm = async () => {
    if (!state) return;
    try {
      setBusy(true);
      await state.onConfirm();
      setState(null);
    } finally {
      setBusy(false);
    }
  };

  const isDestructive = state?.variant === "destructive";

  const dialog = (
    <AlertDialog open={!!state} onOpenChange={(o) => !o && !busy && setState(null)}>
      <AlertDialogContent className="border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                isDestructive
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary",
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <AlertDialogTitle className="text-base">{state?.title}</AlertDialogTitle>
              {state?.description && (
                <AlertDialogDescription className="text-sm">
                  {state.description}
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{state?.cancelLabel ?? "Annuler"}</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            className={cn(
              "text-white shadow-sm",
              isDestructive
                ? "bg-gradient-to-r from-destructive to-red-600 hover:opacity-95"
                : "bg-gradient-to-r from-primary to-[#007aa3] hover:opacity-95",
            )}
          >
            {busy ? "..." : state?.confirmLabel ?? "Confirmer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
