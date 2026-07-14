import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  FileText, Upload, Download, Trash2, RefreshCw, Eye, FileCheck2, Replace,
} from "lucide-react";

const BUCKET = "user-documents";

const DOC_TYPES: { key: string; label: string; icon: typeof FileText }[] = [
  { key: "cv", label: "CV", icon: FileCheck2 },
  { key: "cover-letter", label: "Lettre de motivation", icon: FileText },
  { key: "id-card", label: "Pièce d'identité", icon: FileText },
  { key: "diploma", label: "Diplôme", icon: FileText },
  { key: "other", label: "Autre", icon: FileText },
];

const MAX_SIZE_MB = 10;
const ALLOWED_EXT = ["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp"];

type DocFile = {
  name: string;
  fullPath: string;
  size: number;
  updatedAt: string;
  docType: string;
};

export default function MyDocumentsCard({ userId }: { userId: string }) {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [renameLabel, setRenameLabel] = useState("");
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<DocFile | null>(null);
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();

  const load = async () => {
    setLoading(true);
    const all: DocFile[] = [];
    for (const t of DOC_TYPES) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(`${userId}/${t.key}`, { limit: 100, sortBy: { column: "updated_at", order: "desc"
  } });
      if (error) continue;
      for (const f of data || []) {
        if (f.name.startsWith(".")) continue;
        all.push({
          name: f.name,
          fullPath: `${userId}/${t.key}/${f.name}`,
          size: (f.metadata as any)?.size || 0,
          updatedAt: (f as any).updated_at || (f as any).created_at || "",
          docType: t.key,
        });
      }
    }
    setFiles(all);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [userId]);

  const validate = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXT.includes(ext)) return `Format non autorisé (.${ext}). Autorisés: ${ALLOWED_EXT.join(", ")}`;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `Fichier trop volumineux (max ${MAX_SIZE_MB} Mo)`;
    return null;
  };

  const handleUpload = async (docKey: string, file: File) => {
    const err = validate(file);
    if (err) { toast({ title: "Fichier invalide", description: err, variant: "destructive"
  }); return; }
    setUploading(docKey);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${userId}/${docKey}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type,
    });
    setUploading(null);
    if (error) { toast({ title: "Échec de l'envoi", description: error.message, variant: "destructive"
  }); return; }
    toast({ title: "Document ajouté"
  });
    await load();
  };

  const handleReplace = async (file: File) => {
    if (!replaceTarget) return;
    const err = validate(file);
    if (err) { toast({ title: "Fichier invalide", description: err, variant: "destructive"
  }); return; }
    setUploading(replaceTarget.docType);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const newPath = `${userId}/${replaceTarget.docType}/${Date.now()}-${safe}`;
    const up = await supabase.storage.from(BUCKET).upload(newPath, file, { upsert: false, contentType: file.type });
    if (up.error) {
      setUploading(null);
      toast({ title: "Échec du remplacement", description: up.error.message, variant: "destructive"
  });
      return;
    }
    await supabase.storage.from(BUCKET).remove([replaceTarget.fullPath]);
    setUploading(null);
    setReplaceTarget(null);
    toast({ title: "Document remplacé"
  });
    await load();
  };

  const handleDelete = (f: DocFile) => {
    confirm({
      title: "Supprimer ce document ?",
      description: `${f.name} sera définitivement supprimé.`,
      confirmLabel: "Supprimer",
      variant: "destructive",
      onConfirm: async () => {
        const { error } = await supabase.storage.from(BUCKET).remove([f.fullPath]);
        if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive"
  }); return; }
        toast({ title: "Document supprimé"
  });
        await load();
      },
    });
  };

  const handleView = async (f: DocFile) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.fullPath, 60 * 5);
    if (error || !data?.signedUrl) { toast({ title: "Erreur", description: error?.message || "Lien indisponible", variant: "destructive"
  }); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const fmtSize = (b: number) => {
    if (!b) return "";
    if (b < 1024) return `${b} o`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
    return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="bg-card rounded-xl p-4 sm:p-6 shadow-card border border-border/50 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-card-foreground flex items-center gap-2">
          <FileText size={18} className="text-primary" /> Mes documents
        </h3>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw size={14} /> Actualiser
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Gérez votre CV et autres documents personnels (max {MAX_SIZE_MB} Mo · {ALLOWED_EXT.join(", ")}). Vos documents sont privés ; seuls vous, les RH et les administrateurs y ont accès.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DOC_TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.key} className="border border-border/60 rounded-lg p-3 flex flex-col gap-2 bg-background/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Icon size={14} className="text-primary" /> {t.label}
                </span>
              </div>
              <input
                type="file"
                hidden
                ref={(el) => { inputRefs.current[t.key] = el; }}
                accept={ALLOWED_EXT.map((e) => "." + e).join(",")}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload(t.key, f);
                  e.target.value = "";
                }}
              />
              <Button
                size="sm"
  variant="secondary"
  className="gap-1.5"
                disabled={uploading === t.key}
                onClick={() => inputRefs.current[t.key]?.click()}
              >
                <Upload size={14} /> {uploading === t.key ? "Envoi..." : "Téléverser"}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-card-foreground mt-2">Documents enregistrés</h4>
        {loading ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : files.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun document pour le moment.</p>
        ) : (
          <ul className="divide-y divide-border/60 border border-border/60 rounded-lg overflow-hidden">
            {files.map((f) => {
              const def = DOC_TYPES.find((d) => d.key === f.docType);
              return (
                <li key={f.fullPath} className="flex items-center justify-between gap-3 p-2.5 bg-background/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline"
  className="text-[10px] shrink-0">{def?.label || f.docType}</Badge>
                      <span className="text-sm truncate" title={f.name}>{f.name.replace(/^\d+-/, "")}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {fmtSize(f.size)}{f.updatedAt ? ` · ${new Date(f.updatedAt).toLocaleDateString("fr-FR")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon"
  variant="ghost" title="Voir" onClick={() => handleView(f)}>
                      <Eye size={15} />
                    </Button>
                    <Button
                      size="icon"
  variant="ghost"
                      title="Remplacer"
                      onClick={() => { setReplaceTarget(f); replaceInputRef.current?.click(); }}
                    >
                      <Replace size={15} />
                    </Button>
                    <Button size="icon"
  variant="ghost" title="Supprimer" onClick={() => handleDelete(f)}>
                      <Trash2 size={15} className="text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <input
        type="file"
        hidden
        ref={replaceInputRef}
        accept={ALLOWED_EXT.map((e) => "." + e).join(",")}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleReplace(f);
          e.target.value = "";
        }}
      />
      {dialog}
    </div>
  );
}
