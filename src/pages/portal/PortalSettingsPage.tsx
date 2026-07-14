import { useEffect, useState } from"react";
import { useNavigate } from"react-router-dom";
import { supabase } from"@/integrations/supabase/client";
import { useAuthSession } from"@/hooks/use-auth-session";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Switch } from"@/components/ui/switch";
import { Label } from"@/components/ui/label";
import { Settings, ArrowLeft, Bell, Mail, GraduationCap, Receipt, TicketCheck, Save, Loader2 } from"lucide-react";
import { toast } from"sonner";

type Channel ="email"|"in_app";
type Category ="tickets"|"invoices"|"trainings"|"weekly_digest";

type Prefs = Record<Category, Partial<Record<Channel, boolean>>>;

const DEFAULTS: Prefs = {
 tickets: { email: true, in_app: true },
 invoices: { email: true, in_app: true },
 trainings: { email: true, in_app: true },
 weekly_digest: { email: true },
};

const CATEGORY_META: Record<Category, { label: string; icon: any; channels: Channel[]; help: string }> = {
 tickets: { label:"Tickets de support", icon: TicketCheck, channels: ["email","in_app"], help:"Réponses, changements de statut et résolution."},
 invoices: { label:"Factures", icon: Receipt, channels: ["email","in_app"], help:"Nouvelles factures, rappels d'échéance, paiements reçus."},
 trainings: { label:"Formations", icon: GraduationCap, channels: ["email","in_app"], help:"Nouvelles affectations, certificats, mentions et réponses."},
 weekly_digest: { label:"Résumé hebdomadaire", icon: Mail, channels: ["email"], help:"Email récapitulatif chaque lundi matin."},
};

const CHANNEL_LABEL: Record<Channel, string> = { email:"Email", in_app:"Dans l'app"};

export default function PortalSettingsPage() {
 const { user } = useAuthSession();
 const navigate = useNavigate();
 const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 if (!user) return;
 void (async () => {
 const { data } = await (supabase.from("profiles") as any)
 .select("notification_prefs")
 .eq("user_id", user.id)
 .maybeSingle();
 if (data?.notification_prefs && typeof data.notification_prefs ==="object") {
 setPrefs({ ...DEFAULTS, ...(data.notification_prefs as Prefs) });
 }
 setLoading(false);
 })();
 }, [user]);

 const toggle = (cat: Category, ch: Channel, v: boolean) => {
 setPrefs((p) => ({ ...p, [cat]: { ...p[cat], [ch]: v } }));
 };

 const save = async () => {
 if (!user) return;
 setSaving(true);
 const { error } = await (supabase.from("profiles") as any)
 .update({ notification_prefs: prefs })
 .eq("user_id", user.id);
 setSaving(false);
 if (error) return toast.error(error.message);
 toast.success("Préférences enregistrées");
 };

 return (
 <div className="container mx-auto px-3 sm:px-4 py-6 max-w-3xl space-y-4">
 <div className="flex items-center gap-2">
 <Button variant="ghost"size="icon"onClick={() => navigate("/portal")}>
 <ArrowLeft className="h-4 w-4"/>
 </Button>
 <div>
 <h1 className="text-xl font-bold flex items-center gap-2">
 <Settings className="h-5 w-5 text-primary"/> Paramètres
 </h1>
 <p className="text-xs text-muted-foreground">Personnalisez vos notifications et préférences.</p>
 </div>
 </div>

 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-base flex items-center gap-2">
 <Bell className="h-4 w-4 text-primary"/> Notifications
 </CardTitle>
 </CardHeader>
 <CardContent>
 {loading ? (
 <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/></div>
 ) : (
 <div className="space-y-4">
 {(Object.entries(CATEGORY_META) as [Category, typeof CATEGORY_META[Category]][]).map(([key, meta]) => {
 const Icon = meta.icon;
 return (
 <div key={key} className="border rounded-lg p-3 sm:p-4 space-y-2">
 <div className="flex items-start gap-3">
 <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <Icon className="h-4 w-4"/>
 </div>
 <div className="flex-1 min-w-0">
 <div className="font-medium text-sm">{meta.label}</div>
 <div className="text-xs text-muted-foreground">{meta.help}</div>
 </div>
 </div>
 <div className="flex flex-wrap gap-3 pl-12">
 {meta.channels.map((ch) => (
 <div key={ch} className="flex items-center gap-2">
 <Switch
 checked={!!prefs[key]?.[ch]}
 onCheckedChange={(v) => toggle(key, ch, v)}
 id={`${key}-${ch}`}
 />
 <Label htmlFor={`${key}-${ch}`} className="text-xs cursor-pointer">
 {CHANNEL_LABEL[ch]}
 </Label>
 </div>
 ))}
 </div>
 </div>
 );
 })}

 <div className="flex justify-end pt-2">
 <Button onClick={save} disabled={saving} className="bg-primary">
 {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1"/> : <Save className="h-4 w-4 mr-1"/>}
 Enregistrer
 </Button>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 );
}
