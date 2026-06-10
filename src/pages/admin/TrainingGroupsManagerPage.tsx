import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrainingPageHero } from "@/components/training/TrainingPageHero";
import {
  Loader2,
  Layers,
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
  Users,
  GraduationCap,
  Search,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

type Group = {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  training_count: number;
  created_at: string;
};

type Training = { id: string; title: string; category: string | null };
type UserRow = { user_id: string; full_name: string; email: string };

interface Props {
  basePath: "/admin" | "/rh";
  parentLabel: string;
}

export default function TrainingGroupsManagerPage({ basePath, parentLabel }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveBase = location.pathname.startsWith("/rh") ? "/rh" : basePath;

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_training_groups_summary");
    if (error) toast.error(error.message);
    else setGroups((data || []) as Group[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setName("");
    setDescription("");
    setCreateOpen(true);
  };

  const openEdit = (g: Group) => {
    setEditId(g.id);
    setName(g.name);
    setDescription(g.description || "");
    setCreateOpen(true);
  };

  const saveGroup = async () => {
    if (!name.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }
    setSaving(true);
    if (editId) {
      const { error } = await supabase
        .from("training_groups")
        .update({ name: name.trim(), description: description.trim() || null })
        .eq("id", editId);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      toast.success("Groupe mis à jour");
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("training_groups")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          created_by: u.user?.id,
        });
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      toast.success("Groupe créé");
    }
    setSaving(false);
    setCreateOpen(false);
    void load();
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Supprimer ce groupe ? Les formations déjà assignées aux membres ne sont pas retirées.")) return;
    const { error } = await supabase.from("training_groups").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Groupe supprimé");
      void load();
    }
  };

  const openDetail = (g: Group) => {
    setActiveGroup(g);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      <TrainingPageHero
        icon={<Layers className="h-6 w-6" />}
        title="Groupes de formation"
        subtitle="Créez des groupes pour assigner automatiquement un lot de formations à plusieurs employés. L'ajout d'une formation ou d'un membre propage les inscriptions."
        breadcrumbs={[
          { label: parentLabel },
          { label: "Formations" },
          { label: "Groupes" },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`${effectiveBase}/formations`)}
              className="bg-white/15 hover:bg-white/25 text-white border-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
            <Button size="sm" onClick={openCreate} className="bg-white text-primary hover:bg-white/90">
              <Plus className="h-4 w-4 mr-1" /> Nouveau groupe
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={load}
              className="bg-white/15 hover:bg-white/25 text-white border-white/20"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
            </Button>
          </div>
        }
      />

      <Card className="p-4">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Aucun groupe pour le moment. Créez-en un avec « Nouveau groupe ».
          </div>
        ) : (
          <ul className="divide-y">
            {groups.map((g) => (
              <li key={g.id} className="py-3 flex items-center gap-3">
                <button
                  onClick={() => openDetail(g)}
                  className="flex-1 text-left min-w-0 hover:bg-accent/40 rounded p-2 -m-2 transition"
                >
                  <div className="font-medium text-sm truncate">{g.name}</div>
                  {g.description && (
                    <div className="text-xs text-muted-foreground truncate">{g.description}</div>
                  )}
                  <div className="mt-1 flex items-center gap-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">
                      <Users className="h-3 w-3 mr-1" />
                      {g.member_count} membre{g.member_count > 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      <GraduationCap className="h-3 w-3 mr-1" />
                      {g.training_count} formation{g.training_count > 1 ? "s" : ""}
                    </Badge>
                  </div>
                </button>
                <Button size="icon" variant="ghost" onClick={() => openEdit(g)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteGroup(g.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="bg-gradient-primary-deep px-6 py-4">
            <DialogTitle className="text-white">
              {editId ? "Modifier le groupe" : "Nouveau groupe"}
            </DialogTitle>
            <DialogDescription className="text-white/80">
              Les groupes propagent automatiquement les formations à tous leurs membres.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Équipe Finance" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description (optionnel)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="À quoi sert ce groupe ?"
              />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={saveGroup} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeGroup && (
        <GroupDetailDialog
          open={detailOpen}
          onOpenChange={(v) => {
            setDetailOpen(v);
            if (!v) void load();
          }}
          group={activeGroup}
        />
      )}
    </div>
  );
}

// =========================
// Group detail dialog
// =========================
function GroupDetailDialog({
  open,
  onOpenChange,
  group,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  group: Group;
}) {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [assignedTrainingIds, setAssignedTrainingIds] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<UserRow[]>([]);
  const [memberUserIds, setMemberUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [tSearch, setTSearch] = useState("");
  const [uSearch, setUSearch] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const [tAll, tAssigned, uAll, mems] = await Promise.all([
      supabase.from("trainings").select("id, title, category").eq("active", true).order("title"),
      supabase.from("training_group_assignments").select("training_id").eq("group_id", group.id),
      supabase.rpc("list_employee_assignable_users"),
      supabase
        .from("training_group_members")
        .select("process_id, onboarding_processes:process_id ( user_id )")
        .eq("group_id", group.id),
    ]);

    if (tAll.error) toast.error(tAll.error.message);
    else setTrainings((tAll.data || []) as Training[]);

    if (!tAssigned.error)
      setAssignedTrainingIds(new Set((tAssigned.data || []).map((r: any) => r.training_id)));

    if (uAll.error) toast.error(uAll.error.message);
    else setUsers((uAll.data || []).map((u: any) => ({ user_id: u.user_id, full_name: u.full_name, email: u.email })));

    if (!mems.error) {
      const ids = (mems.data || [])
        .map((m: any) => m.onboarding_processes?.user_id)
        .filter(Boolean) as string[];
      setMemberUserIds(new Set(ids));
    }
    setLoading(false);
  }, [group.id]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const filteredTrainings = useMemo(() => {
    const q = tSearch.trim().toLowerCase();
    if (!q) return trainings;
    return trainings.filter(
      (t) => t.title.toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q),
    );
  }, [trainings, tSearch]);

  const filteredUsers = useMemo(() => {
    const q = uSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, uSearch]);

  const toggleTraining = async (trainingId: string, checked: boolean) => {
    if (checked) {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("training_group_assignments").insert({
        group_id: group.id,
        training_id: trainingId,
        assigned_by: u.user?.id,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setAssignedTrainingIds((s) => new Set([...s, trainingId]));
      toast.success("Formation ajoutée — propagée aux membres");
    } else {
      const { error } = await supabase
        .from("training_group_assignments")
        .delete()
        .eq("group_id", group.id)
        .eq("training_id", trainingId);
      if (error) {
        toast.error(error.message);
        return;
      }
      setAssignedTrainingIds((s) => {
        const n = new Set(s);
        n.delete(trainingId);
        return n;
      });
      toast.success("Formation retirée du groupe");
    }
  };

  const toggleMember = async (userId: string, checked: boolean) => {
    if (checked) {
      const { error } = await supabase.rpc("add_user_to_training_group", {
        _group_id: group.id,
        _user_id: userId,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setMemberUserIds((s) => new Set([...s, userId]));
      toast.success("Membre ajouté — formations propagées");
    } else {
      // Find the process_id and delete
      const { data: proc } = await supabase
        .from("onboarding_processes")
        .select("id")
        .eq("user_id", userId)
        .eq("kind", "employee_training")
        .maybeSingle();
      if (!proc) return;
      const { error } = await supabase
        .from("training_group_members")
        .delete()
        .eq("group_id", group.id)
        .eq("process_id", proc.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      setMemberUserIds((s) => {
        const n = new Set(s);
        n.delete(userId);
        return n;
      });
      toast.success("Membre retiré du groupe");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="bg-gradient-primary-deep px-6 py-4">
          <DialogTitle className="text-white">{group.name}</DialogTitle>
          <DialogDescription className="text-white/80">
            Gérez les formations du groupe et ses membres. Les changements sont propagés automatiquement.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-6 grid md:grid-cols-2 gap-4">
            {/* Trainings */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" /> Formations ({assignedTrainingIds.size})
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher…"
                  value={tSearch}
                  onChange={(e) => setTSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <ScrollArea className="h-72 rounded-lg border">
                <ul className="divide-y">
                  {filteredTrainings.map((t) => (
                    <li key={t.id}>
                      <label className="flex items-center gap-2 p-2.5 hover:bg-accent/40 cursor-pointer">
                        <Checkbox
                          checked={assignedTrainingIds.has(t.id)}
                          onCheckedChange={(v) => toggleTraining(t.id, !!v)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm truncate">{t.title}</div>
                          {t.category && (
                            <div className="text-[10px] text-muted-foreground truncate">{t.category}</div>
                          )}
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>

            {/* Members */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Membres ({memberUserIds.size})
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher…"
                  value={uSearch}
                  onChange={(e) => setUSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <ScrollArea className="h-72 rounded-lg border">
                <ul className="divide-y">
                  {filteredUsers.map((u) => (
                    <li key={u.user_id}>
                      <label className="flex items-center gap-2 p-2.5 hover:bg-accent/40 cursor-pointer">
                        <Checkbox
                          checked={memberUserIds.has(u.user_id)}
                          onCheckedChange={(v) => toggleMember(u.user_id, !!v)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm truncate">{u.full_name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter className="px-6 pb-6">
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
