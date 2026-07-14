import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Image as ImageIcon, Youtube, Link2, Upload, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MediaCapsule = {
  type: "image" | "youtube";
  url: string;
  caption?: string;
};

export function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{11})/);
  return m?.[1] || null;
}

export function MediaCapsuleView({ item }: { item: MediaCapsule }) {
  if (item.type === "youtube") {
    const id = getYoutubeId(item.url);
    if (!id) return null;
    return (
      <div className="my-3">
        <div className="relative w-full overflow-hidden rounded-lg border" style={{ paddingBottom: "56.25%"
  }}>
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            className="absolute inset-0 w-full h-full"
            title={item.caption || "Vidéo YouTube"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {item.caption && <p className="text-xs text-muted-foreground mt-1 italic text-center">{item.caption}</p>}
      </div>
    );
  }
  return (
    <div className="my-3 text-center">
      <img src={item.url} alt={item.caption || ""} className="max-h-80 mx-auto rounded-lg border" loading="lazy" />
      {item.caption && <p className="text-xs text-muted-foreground mt-1 italic">{item.caption}</p>}
    </div>
  );
}

export function MediaCapsuleList({ items }: { items?: MediaCapsule[] }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-1">
      {items.map((it, i) => <MediaCapsuleView key={i} item={it} />)}
    </div>
  );
}

export function TrainingMediaEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: MediaCapsule[];
  onChange: (next: MediaCapsule[]) => void;
}) {
  const [urlInput, setUrlInput] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const add = (type: "image" | "youtube") => {
    if (!urlInput.trim()) return toast.error("URL requise");
    if (type === "youtube" && !getYoutubeId(urlInput)) return toast.error("URL YouTube invalide");
    onChange([...items, { type, url: urlInput.trim(), caption: caption.trim() || undefined }]);
    setUrlInput("");
    setCaption("");
  };

  const upload = async (file: File) => {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) return toast.error("Format accepté : PNG, JPEG, WEBP, GIF");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image > 5 Mo");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `training-media/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("email-assets").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("email-assets").getPublicUrl(path);
      onChange([...items, { type: "image", url: data.publicUrl, caption: caption.trim() || undefined }]);
      setCaption("");
      toast.success("Image téléversée");
    } catch (e: any) {
      toast.error(e?.message || "Échec téléversement");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = (i: number) => onChange(items.filter((_, k) => k !== i));

  return (
    <Card className="p-2 bg-background/50 border-dashed">
      <div className="text-xs font-medium mb-2 flex items-center gap-1">
        <ImageIcon className="h-3 w-3 text-primary" />{label}
        {items.length > 0 && <span className="text-muted-foreground">({items.length})</span>}
      </div>

      {items.length > 0 && (
        <div className="space-y-1 mb-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1">
              {it.type === "youtube" ? <Youtube className="h-3 w-3 text-red-500 shrink-0" /> : <ImageIcon className="h-3 w-3 text-primary shrink-0" />}
              <span className="truncate flex-1">{it.caption || it.url}</span>
              <Button size="icon"
  variant="ghost"
  className="h-5 w-5" onClick={() => remove(i)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Input
          className="h-7 text-xs"
          placeholder="URL (image ou YouTube)"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
        />
        <Input
          className="h-7 text-xs"
          placeholder="Légende (optionnel)"
          value={caption}
          onChange={e => setCaption(e.target.value)}
        />
        <div className="flex gap-1 flex-wrap">
          <Button size="sm"
  variant="outline"
  className="h-7 text-xs" onClick={() => add("image")} disabled={!urlInput.trim()}>
            <Link2 className="h-3 w-3 mr-1" />Image URL
          </Button>
          <Button size="sm"
  variant="outline"
  className="h-7 text-xs" onClick={() => add("youtube")} disabled={!urlInput.trim()}>
            <Youtube className="h-3 w-3 mr-1" />YouTube
          </Button>
          <Button size="sm"
  variant="outline"
  className="h-7 text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}Téléverser image
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
  className="hidden"
            onChange={e => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </div>
      </div>
    </Card>
  );
}
