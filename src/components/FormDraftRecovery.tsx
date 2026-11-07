import { Button } from "@/components/ui/button";
import type { FormDraftControls } from "@/lib/form-draft";

export function FormDraftRecovery<T>({ draft, onRestore }: { draft: FormDraftControls<T>; onRestore: (value: T) => void }) {
  if (!draft.pendingDraft) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 p-3">
      <p className="flex-1 text-sm">Un brouillon non enregistré du {new Date(draft.pendingDraft.savedAt).toLocaleString("fr-FR")} a été retrouvé.</p>
      <Button size="sm" variant="outline" onClick={() => { const value = draft.restore(); if (value) onRestore(value); }}>Reprendre le brouillon</Button>
      <Button size="sm" variant="ghost" onClick={draft.discard}>Ignorer</Button>
    </div>
  );
}