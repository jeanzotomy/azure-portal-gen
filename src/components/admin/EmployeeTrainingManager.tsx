import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  ChevronRight,
  GraduationCap,
  CheckCircle2,
  Users,
  TrendingUp,
  BookOpen,
  RefreshCw,
  UsersRound,
  Layers,
  Mail,
} from "lucide-react";
import { TrainingPageHero } from "@/components/training/TrainingPageHero";
import { TrainingStatsGrid } from "@/components/training/TrainingStatsGrid";
import BulkAssignTrainingDialog from "@/components/admin/BulkAssignTrainingDialog";
import SendDirectEmailDialog from "@/components/admin/SendDirectEmailDialog";

type UserRow = {
  user_id: string;
  full_name: string;
  email: string;
  total_assigned: number;
  total_completed: number;
  process_id: string | null;
};

export default function EmployeeTrainingManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/rh") ? "/rh" : "/admin";

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "with" | "without">("all");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState<UserRow | null>(null);



  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase.rpc("list_employee_assignable_users");
    if (error) toast.error(error.message);
    else setUsers((data || []) as UserRow[]);
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

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

  const kpis = useMemo(() => {
    const usersWith = users.filter((u) => u.total_assigned > 0).length;
    const totalAssignments = users.reduce((s, u) => s + u.total_assigned, 0);
    const totalCompleted = users.reduce((s, u) => s + u.total_completed, 0);
    const rate = totalAssignments > 0 ? Math.round((totalCompleted / totalAssignments) * 100) : 0;
    return { usersWith, totalAssignments, totalCompleted, rate };
  }, [users]);

  const openUser = (userId: string) => {
    navigate(`${basePath}/formations/assignations/${userId}`);
  };

  return (
    <div className="space-y-4">
      <TrainingPageHero
        icon={<GraduationCap className="h-6 w-6" />}
        title="Centre de formation employés"
        subtitle="Assignez et suivez les formations continues du personnel. Cliquez sur un utilisateur pour gérer son parcours."
        breadcrumbs={[{ label: basePath === "/rh" ? "RH" : "Admin" }, { label: "Formations employés" }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => setBulkOpen(true)}
              className="bg-white text-primary hover:bg-white/90"
            >
              <UsersRound className="h-4 w-4 mr-1" /> Assigner en masse
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`${basePath}/formations/groupes`)}
              className="bg-white/15 hover:bg-white/25 text-white border-white/20"
            >
              <Layers className="h-4 w-4 mr-1" /> Groupes
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={loadUsers}
              className="bg-white/15 hover:bg-white/25 text-white border-white/20"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
            </Button>
          </div>
        }
      />

      <TrainingStatsGrid
        stats={[
          { icon: Users, label: "Utilisateurs avec formation", value: kpis.usersWith, accent: "primary" },
          { icon: BookOpen, label: "Assignations totales", value: kpis.totalAssignments, accent: "cyan" },
          { icon: CheckCircle2, label: "Complétées", value: kpis.totalCompleted, accent: "emerald" },
          { icon: TrendingUp, label: "Taux de complétion", value: `${kpis.rate}%`, accent: "amber" },
        ]}
      />

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm md:text-base">
            <GraduationCap className="h-5 w-5 text-primary" /> Annuaire des employés
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "with" | "without")} className="mb-3">
          <TabsList>
            <TabsTrigger value="all" className="text-xs">Tous ({users.length})</TabsTrigger>
            <TabsTrigger value="with" className="text-xs">Avec formations</TabsTrigger>
            <TabsTrigger value="without" className="text-xs">Sans formation</TabsTrigger>
          </TabsList>
        </Tabs>

        <ScrollArea className="h-[500px] rounded-lg border">
          {loadingUsers ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Aucun utilisateur correspondant.
            </div>
          ) : (
            <ul className="divide-y">
              {filteredUsers.map((u) => (
                <li key={u.user_id} className="flex items-stretch">
                  <button
                    onClick={() => openUser(u.user_id)}
                    className="flex-1 text-left p-3 hover:bg-accent/40 transition flex items-center gap-3 group min-w-0"
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-semibold text-primary text-sm shrink-0">
                      {u.full_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
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
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEmailTarget(u); }}
                    title={`Envoyer un email à ${u.full_name}`}
                    className="px-3 border-l hover:bg-primary/10 text-muted-foreground hover:text-primary transition flex items-center"
                  >
                    <Mail className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </Card>

      <BulkAssignTrainingDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        users={users.map((u) => ({ user_id: u.user_id, full_name: u.full_name, email: u.email }))}
        onDone={loadUsers}
      />
    </div>
  );
}
