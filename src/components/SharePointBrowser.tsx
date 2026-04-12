import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen, FileText, Upload, ArrowLeft, RefreshCw, HardDrive,
  ChevronRight, Download, Globe, FolderPlus,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

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

  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [selectedDrive, setSelectedDrive] = useState<Drive | null>(null);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

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

  const loadSites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callProxy("list-sites", { search: searchQuery || "*" });
      setSites(data.value || []);
    } catch (err: unknown) {
      toast({ title: t("sharepoint.error"), description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [callProxy, searchQuery, t, toast]);

  useEffect(() => { loadSites(); }, []);

  const selectSite = async (site: Site) => {
    setSelectedSite(site);
    setLoading(true);
    try {
      const data = await callProxy("list-drives", { siteId: site.id });
      setDrives(data.value || []);
    } catch (err: unknown) {
      toast({ title: t("sharepoint.error"), description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectDrive = async (drive: Drive) => {
    setSelectedDrive(drive);
    setBreadcrumb([]);
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
    if (!selectedDrive) {
      if (!selectedSite) return;
      setSelectedSite(null);
      setDrives([]);
      return;
    }
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
      // Refresh
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
      // Refresh
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

  // Sites view
  if (!selectedSite) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{t("sharepoint.selectSite")}</h3>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={t("sharepoint.searchSites")}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && loadSites()}
            className="max-w-sm"
          />
          <Button variant="outline" size="icon" onClick={loadSites}>
            <RefreshCw size={16} />
          </Button>
        </div>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : sites.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("sharepoint.noSites")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sites.map(site => (
              <Card key={site.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => selectSite(site)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Globe className="h-8 w-8 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{site.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{site.webUrl}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Drives view
  if (!selectedDrive) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft size={16} />
          </Button>
          <Globe className="h-5 w-5 text-primary" />
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
        <span className="text-sm text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => { setSelectedSite(null); setSelectedDrive(null); setItems([]); setBreadcrumb([]); }}>
          {selectedSite.displayName}
        </span>
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

      <div className="flex items-center gap-2">
        <label className="cursor-pointer">
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          <Button variant="outline" size="sm" className="gap-2" asChild disabled={uploading}>
            <span>
              <Upload size={14} />
              {uploading ? t("sharepoint.uploading") : t("sharepoint.upload")}
            </span>
          </Button>
        </label>
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
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">{t("sharepoint.emptyFolder")}</p>
      ) : (
        <div className="border rounded-lg divide-y">
          {items.map(item => (
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
      )}

      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sharepoint.newFolder")}</DialogTitle>
          </DialogHeader>
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
