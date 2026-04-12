import { useTranslation } from "@/i18n/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, Receipt } from "lucide-react";
import SharePointBrowser from "./SharePointBrowser";
import InvoicesTab from "./InvoicesTab";

export default function SharePointTab({ readOnly = false }: { readOnly?: boolean }) {
  const { t } = useTranslation();

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
          <TabsTrigger value="invoices" className="gap-2">
            <Receipt size={14} />
            {t("sharepoint.invoicesTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="mt-4">
          <SharePointBrowser />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab readOnly={readOnly} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
