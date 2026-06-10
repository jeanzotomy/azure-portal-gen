import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Users, GraduationCap } from "lucide-react";
import { toast } from "sonner";

type UserRow = {
  user_id: string;
  full_name: string;
  email: string;
};

type Training = { id: string; title: string; category: string | null };

interface BulkAssignTrainingDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  users: UserRow[];
  preselectedUserIds?: string[];
  onDone?: () => void;
}

export default function BulkAssignTrainingDialog({
  open,
  onOpenChange,
  users,
  preselectedUserIds,
  onDone,
}: BulkAssignTrainingDialogProps) {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(false);
  const [trainingId, setTrainingId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(preselectedUserIds || []));
    (async () => {
      setLoadingTrainings(true);
      const { data, error } = await supabase
        .from("trainings")
        .select("id, title, category")
        .eq("active", true)
        .order("title");
      if (error) toast.error(error.message);
      else setTrainings((data || []) as Training[]);
      setLoadingTrainings(false);
    })();
  }, [open, preselectedUserIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((u) => selected.has(u.user_id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((u) => next.delete(u.user_id));
      } else {
        filtered.forEach((u) => next.add(u.user_id));
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!trainingId) {
      toast.error("Sélectionnez une formation");
      return;
    }
    if (selected.size === 0) {
      toast.error("Sélectionnez au moins un utilisateur");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc(
      "assign_employee_training_bulk",
      { _user_ids: Array.from(selected), _training_id: trainingId },
    );
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Formation assignée à ${data ?? selected.size} utilisateur(s)`);
    onOpenChange(false);
    setSelected(new Set());
    setTrainingId("");
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="bg-gradient-primary-deep px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5" /> Assignation en masse
          </DialogTitle>
          <DialogDescription className="text-white/80">
            Sélectionnez une formation puis cochez les employés à inscrire.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5" /> Formation
            </Label>
            <Select value={trainingId} onValueChange={setTrainingId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingTrainings ? "Chargement…" : "Choisir une formation"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {trainings.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                    {t.category ? (
                      <span className="text-muted-foreground"> · {t.category}</span>
                    ) : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Label className="text-xs font-medium">
                Employés ({selected.size} sélectionné{selected.size > 1 ? "s" : ""})
              </Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleAll}
                className="text-xs h-7"
              >
                {allFilteredSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            <ScrollArea className="h-72 rounded-lg border">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Aucun utilisateur trouvé.
                </div>
              ) : (
                <ul className="divide-y">
                  {filtered.map((u) => {
                    const checked = selected.has(u.user_id);
                    return (
                      <li key={u.user_id}>
                        <label className="flex items-center gap-3 p-2.5 hover:bg-accent/40 cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggle(u.user_id)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">
                              {u.full_name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {u.email}
                            </div>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !trainingId || selected.size === 0}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assigner ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
