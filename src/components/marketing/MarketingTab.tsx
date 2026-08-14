import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignsManager } from "./CampaignsManager";
import { LeadsManager } from "./LeadsManager";
import { MarketingSettingsCard } from "./MarketingSettingsCard";
import { Megaphone, Settings, Users } from "lucide-react";

interface Props {
  /** `agent` peut consulter et faire avancer, mais pas supprimer. */
  canDelete: boolean;
  initialSection?: "campaigns" | "leads" | "settings";
}

export default function MarketingTab({ canDelete, initialSection = "leads" }: Props) {
  const [section, setSection] = useState(initialSection);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Marketing &amp; prospection</h2>
        <p className="text-sm text-muted-foreground">Campagnes, prospects et paramètres de qualification.</p>
      </div>

      <Tabs value={section} onValueChange={(v) => setSection(v as typeof section)}>
        <TabsList className="inline-flex h-auto w-fit max-w-full flex-wrap">
          <TabsTrigger value="campaigns" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" /> Campagnes</TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Prospects</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-3.5 w-3.5" /> Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-4">
          <CampaignsManager canDelete={canDelete} />
        </TabsContent>
        <TabsContent value="leads" className="mt-4">
          <LeadsManager canDelete={canDelete} />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <MarketingSettingsCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
