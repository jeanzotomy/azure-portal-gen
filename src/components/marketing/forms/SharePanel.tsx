import { useEffect, useState } from "react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { publicUrl } from "@/lib/site-url";
import { Copy, Download, ExternalLink, FileText, MessageCircle, QrCode } from "lucide-react";

interface Props {
  slug: string;
  title: string;
  published: boolean;
}

export function SharePanel({ slug, title, published }: Props) {
  const url = publicUrl(`/f/${slug}`);
  const iframeSnippet = `<iframe src="${url}?embed=1" title="${title}" width="100%" height="900" style="border:0;border-radius:16px" loading="lazy"></iframe>`;
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(""));
  }, [url]);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié`);
    } catch {
      toast.error("Copie impossible sur cet appareil");
    }
  };

  const downloadPng = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `qr-${slug}.png`;
    a.click();
  };

  const downloadPdf = () => {
    if (!qr) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.setFontSize(20);
    doc.text(title, 105, 30, { align: "center", maxWidth: 170 });
    doc.setFontSize(12);
    doc.text("Scannez ce code pour répondre au formulaire", 105, 45, { align: "center" });
    doc.addImage(qr, "PNG", 55, 60, 100, 100);
    doc.setFontSize(11);
    doc.text(url, 105, 175, { align: "center", maxWidth: 170 });
    doc.setFontSize(10);
    doc.text("Cloud Mature — www.cloudmature.com", 105, 285, { align: "center" });
    doc.save(`qr-${slug}.pdf`);
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;

  return (
    <div className="space-y-4">
      {!published && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          Ce formulaire n'est pas encore publié : le lien ne fonctionnera pour les visiteurs qu'une fois
          le statut passé à « Publiée ».
        </p>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Adresse publique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={url} className="font-mono text-sm" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => copy(url, "Lien")}>
                <Copy className="mr-2 h-4 w-4" /> Copier
              </Button>
              <Button variant="outline" asChild>
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Ouvrir
                </a>
              </Button>
            </div>
          </div>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> Partager sur WhatsApp
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-4 w-4" /> QR code
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {qr
            ? <img src={qr} alt={`QR code du formulaire ${title}`} className="h-40 w-40 rounded-xl border border-border bg-white p-2" />
            : <div className="h-40 w-40 animate-pulse rounded-xl bg-muted" />}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              À imprimer sur une affiche, un kakémono de salon ou à montrer en clientèle : le prospect
              scanne et répond depuis son téléphone.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={downloadPng} disabled={!qr}>
                <Download className="mr-2 h-4 w-4" /> PNG
              </Button>
              <Button variant="outline" size="sm" onClick={downloadPdf} disabled={!qr}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Intégrer dans un autre site</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea readOnly value={iframeSnippet} rows={3} className="font-mono text-xs" />
          <Button variant="outline" size="sm" onClick={() => copy(iframeSnippet, "Code d'intégration")}>
            <Copy className="mr-2 h-4 w-4" /> Copier le code
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
