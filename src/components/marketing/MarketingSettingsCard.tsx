import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { MarketingSettings } from "./marketing-shared";
import { Loader2 } from "lucide-react";

export function MarketingSettingsCard() {
  const [settings, setSettings] = useState<MarketingSettings | null>(null);
  const [candidates, setCandidates] = useState<{ user_id: string; full_name: string | null }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: row }, { data: roleRows }] = await Promise.all([
        supabase.from("marketing_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("user_roles").select("user_id, role").in("role", ["admin", "gestionnaire", "agent"]),
      ]);
      setSettings((row as MarketingSettings) ?? null);
      const ids = [...new Set((roleRows ?? []).map((r) => r.user_id))];
      if (ids.length) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
        setCandidates((profiles as { user_id: string; full_name: string | null }[]) ?? []);
      }
    })();
  }, []);

  if (!settings) return <Skeleton className="h-96 w-full" />;

  const set = <K extends keyof MarketingSettings>(key: K, value: MarketingSettings[K]) =>
    setSettings((p) => (p ? { ...p, [key]: value } : p));

  const save = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("marketing_settings")
      .update({
        notification_email: settings.notification_email,
        auto_confirmation_enabled: settings.auto_confirmation_enabled,
        score_urgent_threshold: settings.score_urgent_threshold,
        score_qualified_threshold: settings.score_qualified_threshold,
        sales_user_ids: settings.sales_user_ids,
        consent_text: settings.consent_text,
        updated_by: userData.user?.id ?? null,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) { toast.error("Enregistrement impossible"); return; }
    toast.success("Paramètres enregistrés");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres marketing</CardTitle>
        <CardDescription>Notifications, seuils de qualification et consentement.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>E-mail de réception des notifications</Label>
            <Input
              type="email"
              value={settings.notification_email}
              onChange={(e) => set("notification_email", e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Switch
                checked={settings.auto_confirmation_enabled}
                onCheckedChange={(v) => set("auto_confirmation_enabled", v)}
              />
              <span className="text-sm">Confirmation automatique au prospect</span>
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Seuil « Urgent » (points)</Label>
            <Input
              type="number"
              value={settings.score_urgent_threshold}
              onChange={(e) => set("score_urgent_threshold", Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Seuil « Qualifié » (points)</Label>
            <Input
              type="number"
              value={settings.score_qualified_threshold}
              onChange={(e) => set("score_qualified_threshold", Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Commerciaux pouvant recevoir une assignation</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {candidates.map((c) => (
              <label key={c.user_id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                <Checkbox
                  checked={settings.sales_user_ids.includes(c.user_id)}
                  onCheckedChange={(v) =>
                    set("sales_user_ids", v === true
                      ? [...settings.sales_user_ids, c.user_id]
                      : settings.sales_user_ids.filter((id) => id !== c.user_id))
                  }
                />
                {c.full_name || c.user_id.slice(0, 8)}
              </label>
            ))}
            {candidates.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun utilisateur commercial trouvé.</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Texte du consentement</Label>
          <Textarea rows={4} value={settings.consent_text} onChange={(e) => set("consent_text", e.target.value)} />
        </div>

        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}
