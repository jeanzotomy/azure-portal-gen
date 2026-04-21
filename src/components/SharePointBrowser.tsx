import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FolderOpen, FileText, Upload, ArrowLeft, RefreshCw, HardDrive,
  ChevronRight, Download, FolderPlus, AlertCircle, Search, ArrowUpDown,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter,
} from "@/components/ui/dialog";
import { FormDialogHeader, formDialogContentClass } from "@/components/FormDialogHeader";

interface DriveItem {
  id: string;
  name: string;
  size?: number;
  lastModifiedDateTime?: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  webUrl?: string;
  "@microsoft.graph.downloadUrl"?: string;
}

interface Site {
  id: string;
  displayName: string;
  webUrl: string;
  name: string;
}

interface Drive {
  id: string;
  name: string;
  driveType: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

export default function SharePointBrowser() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [selectedDrive, setSelectedDrive] = useState<Drive | null>(null);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [initError, setInitError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
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

  // Auto-select the "projet" site on mount
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await callProxy("list-sites", { search: "projet" });
        const sites: Site[] = data.value || [];
        if (!active) return;
        if (sites.length === 0) {
          setInitError("Site « Projet » introuvable.");
          return;
        }
        const site = sites[0];
        setSelectedSite(site);
        // Also load drives
        const drivesData = await callProxy("list-drives", { siteId: site.id });
        if (!active) return;
        const drivesList: Drive[] = drivesData.value || [];
        setDrives(drivesList);
        const docsDrive = drivesList.find(
          (d) => d.name.toLowerCase().includes("document")
        );
        if (docsDrive) {
          setSelectedDrive(docsDrive);
          const filesData = await callProxy("list-files", { siteId: site.id, driveId: docsDrive.id });
          if (!active) return;
          setItems(filesData.value || []);
        }
      } catch (err: unknown) {
        if (active) setInitError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [callProxy]);

  const selectDrive = async (drive: Drive) => {
    setSelectedDrive(drive);
    setBreadcrumb([]);
    setSearchQuery("");
    setLoading(true);
    try {
      const data = await callProxy("list-files", { siteId: selectedSite!.id, driveId: drive.id });
      setItems(data.value || []);
    } catch (err: unknown) {
      toast({ title: t("sharepoint.error"), description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openFolder = async (folder: DriveItem) => {
    setLoading(true);
    setSearchQuery("");
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }]);
    try {
      const data = await callProxy("list-files", {
        siteId: selectedSite!.id,
        driveId: selectedDrive!.id,
        folderId: folder.id,
      });
      setItems(data.value || []);
    } catch (err: unknown) {
      toast({ title: t("sharepoint.error"), description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const goBack = async () => {
    if (!selectedDrive) return; // No going back past drives
    if (breadcrumb.length === 0) {
      setSelectedDrive(null);
      setItems([]);
      return;
    }
    const newBreadcrumb = [...breadcrumb];
    newBreadcrumb.pop();
    setBreadcrumb(newBreadcrumb);
    setLoading(true);
    try {
      const params: Record<string, string> = {
        siteId: selectedSite!.id,
        driveId: selectedDrive.id,
      };
      if (newBreadcrumb.length > 0) {
        params.folderId = newBreadcrumb[newBreadcrumb.length - 1].id;
      }
      const data = await callProxy("list-files", params);
      setItems(data.value || []);
    } catch (err: unknown) {
      toast({ title: t("sharepoint.error"), description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSite || !selectedDrive) return;
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const parentPath = breadcrumb.length > 0 ? `${breadcrumb.map(b => b.name).join("/")}/${file.name}` : file.name;
      const params = new URLSearchParams({
        action: "upload-file",
        siteId: selectedSite.id,
        driveId: selectedDrive.id,
        filePath: parentPath,
      });

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sharepoint-proxy?${params}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        }
      );
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Upload failed");
      }
      toast({ title: t("sharepoint.uploadSuccess") });
      const refreshParams: Record<string, string> = { siteId: selectedSite.id, driveId: selectedDrive.id };
      if (breadcrumb.length > 0) refreshParams.folderId = breadcrumb[breadcrumb.length - 1].id;
      const data = await callProxy("list-files", refreshParams);
      setItems(data.value || []);
    } catch (err: unknown) {
      toast({ title: t("sharepoint.error"), description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const createFolder = async () => {
    if (!newFolderName || !selectedSite || !selectedDrive) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {
        siteId: selectedSite.id,
        driveId: selectedDrive.id,
        folderName: newFolderName,
      };
      if (breadcrumb.length > 0) {
        params.parentId = breadcrumb[breadcrumb.length - 1].id;
      }
      await callProxy("create-folder", params);
      setShowNewFolder(false);
      setNewFolderName("");
      toast({ title: t("sharepoint.folderCreated") });
      const refreshParams: Record<string, string> = { siteId: selectedSite.id, driveId: selectedDrive.id };
      if (breadcrumb.length > 0) refreshParams.folderId = breadcrumb[breadcrumb.length - 1].id;
      const data = await callProxy("list-files", refreshParams);
      setItems(data.value || []);
    } catch (err: unknown) {
      toast({ title: t("sharepoint.error"), description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Init loading or error
  if (!selectedSite) {
    if (initError) {
      return (
        <div className="flex items-center gap-3 p-6 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{initError}</p>
        </div>
      );
    }
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </div>
    );
  }

  // Drives view
  if (!selectedDrive) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <HardDrive className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{selectedSite.displayName}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t("sharepoint.selectDrive")}</p>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {drives.map(drive => (
              <Card key={drive.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => selectDrive(drive)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <HardDrive className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">{drive.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{drive.driveType}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // File browser view
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft size={16} />
        </Button>
        <span className="text-sm font-medium">{selectedSite.displayName}</span>
        <ChevronRight size={14} className="text-muted-foreground" />
        <span className="text-sm text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => { setSelectedDrive(null); setItems([]); setBreadcrumb([]); }}>
          {selectedDrive.name}
        </span>
        {breadcrumb.map((bc, i) => (
          <span key={bc.id} className="flex items-center gap-1">
            <ChevronRight size={14} className="text-muted-foreground" />
            <span
              className={`text-sm ${i === breadcrumb.length - 1 ? "font-medium" : "text-muted-foreground cursor-pointer hover:text-foreground"}`}
              onClick={() => {
                if (i < breadcrumb.length - 1) {
                  setBreadcrumb(breadcrumb.slice(0, i + 1));
                  openFolder({ id: bc.id, name: bc.name } as DriveItem);
                  setBreadcrumb(breadcrumb.slice(0, i + 1));
                }
              }}
            >
              {bc.name}
            </span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("sharepoint.searchFiles")}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "date" | "size")}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <ArrowUpDown size={14} className="mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nom</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="size">Taille</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")} title={sortDir === "asc" ? "Croissant" : "Décroissant"}>
          <ArrowUpDown size={14} className={sortDir === "desc" ? "rotate-180" : ""} />
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowNewFolder(true)}>
          <FolderPlus size={14} />
          {t("sharepoint.newFolder")}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => {
          const params: Record<string, string> = { siteId: selectedSite.id, driveId: selectedDrive.id };
          if (breadcrumb.length > 0) params.folderId = breadcrumb[breadcrumb.length - 1].id;
          setLoading(true);
          callProxy("list-files", params).then(data => setItems(data.value || [])).finally(() => setLoading(false));
        }}>
          <RefreshCw size={14} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 rounded" />)}
        </div>
      ) : (() => {
        const filteredItems = items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
        // Sort: folders first, then by selected criteria
        const sortedItems = [...filteredItems].sort((a, b) => {
          // Folders always first
          if (a.folder && !b.folder) return -1;
          if (!a.folder && b.folder) return 1;
          let cmp = 0;
          if (sortBy === "name") {
            cmp = a.name.localeCompare(b.name);
          } else if (sortBy === "date") {
            cmp = (a.lastModifiedDateTime || "").localeCompare(b.lastModifiedDateTime || "");
          } else if (sortBy === "size") {
            cmp = (a.size || 0) - (b.size || 0);
          }
          return sortDir === "asc" ? cmp : -cmp;
        });
        if (sortedItems.length === 0) {
          return <p className="text-muted-foreground text-sm py-8 text-center">{searchQuery ? t("sharepoint.noResults") : t("sharepoint.emptyFolder")}</p>;
        }
        return (
          <div className="border rounded-lg divide-y">
            {sortedItems.map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${item.folder ? "cursor-pointer" : ""}`}
                onClick={() => item.folder && openFolder(item)}
              >
                {item.folder ? (
                  <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.folder ? `${item.folder.childCount} ${t("sharepoint.items")}` : formatSize(item.size)}
                    {item.lastModifiedDateTime && ` · ${new Date(item.lastModifiedDateTime).toLocaleDateString()}`}
                  </p>
                </div>
                {item.webUrl && !item.folder && (
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={e => { e.stopPropagation(); window.open(item.webUrl, "_blank"); }}>
                    <Download size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className={formDialogContentClass}>
          <FormDialogHeader
            icon={FolderPlus}
            title={t("sharepoint.newFolder")}
            badges={[]}
          />
          <div className="p-4 sm:p-6 space-y-3">
          <Input
            placeholder={t("sharepoint.folderNamePlaceholder")}
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>{t("sharepoint.cancel")}</Button>
            <Button onClick={createFolder} disabled={!newFolderName}>{t("sharepoint.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
