import { useState } from "react";
import { useTranslation } from "@/i18n/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, List } from "lucide-react";
import SharePointBrowser from "./SharePointBrowser";
import SharePointLists from "./SharePointLists";

interface Site {
  id: string;
  displayName: string;
  webUrl: string;
  name: string;
}

export default function SharePointTab() {
  const { t } = useTranslation();
  const [listsSiteId, setListsSiteId] = useState<string | null>(null);
  const [listsSiteName, setListsSiteName] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t("sharepoint.title")}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t("sharepoint.description")}</p>
      </div>

      <Tabs defaultValue="files" className="w-full">
        <TabsList>
          <TabsTrigger value="files" className="gap-2">
            <FolderOpen size={14} />
            {t("sharepoint.filesTab")}
          </TabsTrigger>
          <TabsTrigger value="lists" className="gap-2">
            <List size={14} />
            {t("sharepoint.listsTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="mt-4">
          <SharePointBrowser />
        </TabsContent>

        <TabsContent value="lists" className="mt-4">
          {listsSiteId ? (
            <SharePointLists
              siteId={listsSiteId}
              siteName={listsSiteName}
              onBack={() => setListsSiteId(null)}
            />
          ) : (
            <SharePointBrowser />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
