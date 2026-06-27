import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useSocialChannels } from "@/hooks/use-social-channels";
import {
  buildMessengerUrl,
  buildTelegramUrl,
  buildWhatsappUrl,
  sanitizeE164,
  type SocialChannelsConfig,
} from "@/lib/social-channels";

export default function SocialChannelsCard() {
  const { config, loading, update } = useSocialChannels();
  const [draft, setDraft] = useState<SocialChannelsConfig>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(config); }, [config]);

  const set = <K extends keyof SocialChannelsConfig>(key: K, value: SocialChannelsConfig[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await update({ ...draft, whatsapp_e164: sanitizeE164(draft.whatsapp_e164) });
      toast.success("Canaux sociaux enregistrés");
    } catch (e: any) {
      toast.error(e?.message || "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const waPreview = buildWhatsappUrl(draft.whatsapp_e164, draft.floating_message);
  const mesPreview = buildMessengerUrl(draft.messenger_page);
  const tgPreview = buildTelegramUrl(draft.telegram_handle);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-[#25D366]" />
          Canaux de communication sociale
          {!loading && (waPreview || mesPreview || tgPreview || draft.linkedin_url || draft.facebook_url || draft.x_url) && (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1 ml-1">
              <CheckCircle2 className="h-3 w-3" /> Configuré
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">WhatsApp (numéro E.164, sans +)</Label>
          <Input
            placeholder="224620000000"
            inputMode="numeric"
            value={draft.whatsapp_e164}
            onChange={(e) => set("whatsapp_e164", e.target.value)}
          />
          {waPreview && <p className="text-[11px] text-muted-foreground break-all">→ {waPreview}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Page Facebook Messenger</Label>
          <Input
            placeholder="cloudmature"
            value={draft.messenger_page}
            onChange={(e) => set("messenger_page", e.target.value)}
          />
          {mesPreview && <p className="text-[11px] text-muted-foreground break-all">→ {mesPreview}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Identifiant Telegram</Label>
          <Input
            placeholder="cloudmature"
            value={draft.telegram_handle}
            onChange={(e) => set("telegram_handle", e.target.value)}
          />
          {tgPreview && <p className="text-[11px] text-muted-foreground break-all">→ {tgPreview}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">URL LinkedIn</Label>
          <Input
            placeholder="https://www.linkedin.com/company/cloudmature"
            value={draft.linkedin_url}
            onChange={(e) => set("linkedin_url", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">URL Facebook</Label>
          <Input
            placeholder="https://www.facebook.com/cloudmature"
            value={draft.facebook_url}
            onChange={(e) => set("facebook_url", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">URL X (Twitter)</Label>
          <Input
            placeholder="https://x.com/cloudmature"
            value={draft.x_url}
            onChange={(e) => set("x_url", e.target.value)}
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <Label className="text-xs">Message WhatsApp pré-rempli</Label>
          <Textarea
            rows={2}
            value={draft.floating_message}
            onChange={(e) => set("floating_message", e.target.value)}
          />
        </div>

        <div className="md:col-span-2 flex items-center justify-between rounded-lg border p-3 bg-muted/20">
          <div>
            <p className="text-sm font-medium">Bouton WhatsApp flottant</p>
            <p className="text-xs text-muted-foreground">Affiché sur toutes les pages publiques (masqué sur portail, admin, auth).</p>
          </div>
          <Switch
            checked={draft.floating_enabled}
            onCheckedChange={(v) => set("floating_enabled", Boolean(v))}
            disabled={!sanitizeE164(draft.whatsapp_e164)}
          />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
