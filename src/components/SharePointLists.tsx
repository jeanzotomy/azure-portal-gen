import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { List, ArrowLeft, RefreshCw, ChevronRight } from "lucide-react";

interface SPList {
  id: string;
  displayName: string;
  description?: string;
  itemCount?: number;
}

interface SPListItem {
  id: string;
  fields?: Record<string, unknown>;
}

interface Props {
  siteId: string;
  siteName: string;
  onBack: () => void;
}

export default function SharePointLists({ siteId, siteName, onBack }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [lists, setLists] = useState<SPList[]>([]);
  const [selectedList, setSelectedList] = useState<SPList | null>(null);
  const [listItems, setListItems] = useState<SPListItem[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const callProxy = useCallback(async (action: string, params: Record<string, string> = {}) => {
    const queryParams = new URLSearchParams({ action, ...params });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sharepoint-proxy?${queryParams}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Request failed");
    return json;
  }, []);

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callProxy("list-lists", { siteId });
      setLists(data.value || []);
    } catch (err: unknown) {
      toast({ title: t("sharepoint.error"), description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [callProxy, siteId, t, toast]);

  useEffect(() => { loadLists(); }, [loadLists]);

  const openList = async (list: SPList) => {
    setSelectedList(list);
    setLoading(true);
    try {
      const data = await callProxy("list-items", { siteId, listId: list.id });
      const items: SPListItem[] = data.value || [];
      setListItems(items);

      // Extract column names from fields
      const colSet = new Set<string>();
      items.forEach(item => {
        if (item.fields) {
          Object.keys(item.fields).forEach(k => {
            if (!k.startsWith("@") && !k.startsWith("odata") && k !== "id") colSet.add(k);
          });
        }
      });
      setColumns(Array.from(colSet).slice(0, 10)); // Limit columns
    } catch (err: unknown) {
      toast({ title: t("sharepoint.error"), description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (selectedList) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedList(null); setListItems([]); }}>
            <ArrowLeft size={16} />
          </Button>
          <span className="text-sm text-muted-foreground cursor-pointer hover:text-foreground" onClick={onBack}>{siteName}</span>
          <ChevronRight size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium">{selectedList.displayName}</span>
          <Button variant="ghost" size="icon" onClick={() => openList(selectedList)} className="ml-auto">
            <RefreshCw size={14} />
          </Button>
        </div>

        {loading ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : listItems.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">{t("sharepoint.emptyList")}</p>
        ) : (
          <div className="border rounded-lg overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(col => (
                    <TableHead key={col} className="whitespace-nowrap">{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {listItems.map(item => (
                  <TableRow key={item.id}>
                    {columns.map(col => (
                      <TableCell key={col} className="whitespace-nowrap max-w-[200px] truncate">
                        {item.fields?.[col] != null ? String(item.fields[col]) : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={16} />
        </Button>
        <List className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">{t("sharepoint.listsTitle")} — {siteName}</h3>
        <Button variant="ghost" size="icon" onClick={loadLists} className="ml-auto">
          <RefreshCw size={14} />
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : lists.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("sharepoint.noLists")}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {lists.map(list => (
            <Card key={list.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => openList(list)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <List className="h-6 w-6 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{list.displayName}</p>
                    {list.description && <p className="text-xs text-muted-foreground truncate">{list.description}</p>}
                    {list.itemCount != null && <p className="text-xs text-muted-foreground">{list.itemCount} {t("sharepoint.items")}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
