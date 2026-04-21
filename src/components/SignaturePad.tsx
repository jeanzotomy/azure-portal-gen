import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Save } from "lucide-react";

interface SignaturePadProps {
  /** Image initiale (data URL ou URL distante) à afficher dans le canvas. */
  initialImage?: string | null;
  /** Largeur du canvas en pixels CSS. */
  width?: number;
  /** Hauteur du canvas en pixels CSS. */
  height?: number;
  /** Appelé quand l'utilisateur clique sur "Enregistrer". Reçoit un PNG Blob (fond transparent). */
  onSave: (blob: Blob) => Promise<void> | void;
  /** Désactive les actions pendant la sauvegarde externe. */
  saving?: boolean;
}

/**
 * Pad de signature dessinée à la souris ou au tactile.
 * Le PNG produit a un fond transparent (idéal pour insertion sur PDF/Word).
 */
export function SignaturePad({ initialImage, width = 480, height = 180, onSave, saving = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasContent, setHasContent] = useState(false);

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  // Initialise le canvas avec une bonne résolution (DPR)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr;
    c.height = height * dpr;
    c.style.width = `${width}px`;
    c.style.height = `${height}px`;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0B1F33";
  }, [width, height]);

  // Charge l'image initiale si fournie
  useEffect(() => {
    if (!initialImage) return;
    const c = canvasRef.current;
    const ctx = getCtx();
    if (!c || !ctx) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      setHasContent(true);
    };
    img.src = initialImage;
  }, [initialImage, width, height]);

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pointerPos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = getCtx();
    const p = pointerPos(e);
    if (!ctx || !last.current) return;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setHasContent(true);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    last.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  const clear = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    setHasContent(false);
  }, [width, height]);

  const handleSave = async () => {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob(async (blob) => {
      if (blob) await onSave(blob);
    }, "image/png");
  };

  return (
    <div className="space-y-2">
      <div className="border-2 border-dashed border-border rounded-md bg-muted/20 inline-block">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="touch-none cursor-crosshair block"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear} disabled={saving}>
          <Eraser size={14} className="mr-1" /> Effacer
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={!hasContent || saving}>
          <Save size={14} className="mr-1" /> {saving ? "Enregistrement..." : "Enregistrer la signature"}
        </Button>
      </div>
    </div>
  );
}
