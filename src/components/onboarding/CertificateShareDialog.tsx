import { useRef, useState } from"react";
import html2canvas from"html2canvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from"@/components/ui/dialog";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Linkedin, Download, Copy, Check, Share2, Mail, ExternalLink, Twitter } from"lucide-react";
import { toast } from"sonner";
import { CertificateBadge, type BadgeData } from"./CertificateBadge";

type Props = {
 open: boolean;
 onOpenChange: (v: boolean) => void;
 data: BadgeData;
};

const APP_URL ="https://cloudmature.com";

export function CertificateShareDialog({ open, onOpenChange, data }: Props) {
 const badgeRef = useRef<HTMLDivElement>(null);
 const [copied, setCopied] = useState(false);
 const [downloading, setDownloading] = useState(false);

 const shareUrl = `${APP_URL}/verify/${data.verification_code}`;
 const shareText = `Je viens d'obtenir un certificat CloudMature pour"${data.training_title}"🎓`;
 const issuedDate = new Date(data.issued_at);
 const issueYear = issuedDate.getFullYear();
 const issueMonth = issuedDate.getMonth() + 1;

 // LinkedIn"Add to profile"deep link
 const linkedInAddToProfile = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
 data.training_title
 )}&organizationName=${encodeURIComponent("CloudMature")}&issueYear=${issueYear}&issueMonth=${issueMonth}&certUrl=${encodeURIComponent(
 shareUrl
 )}&certId=${encodeURIComponent(data.verification_code)}`;

 const linkedInShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
 const twitterShare = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
 const mailto = `mailto:?subject=${encodeURIComponent("Mon certificat CloudMature")}&body=${encodeURIComponent(
 `${shareText}\n\nVérifier l'authenticité : ${shareUrl}`
 )}`;

 const copyLink = async () => {
 try {
 await navigator.clipboard.writeText(shareUrl);
 setCopied(true);
 toast.success("Lien copié");
 setTimeout(() => setCopied(false), 2000);
 } catch {
 toast.error("Impossible de copier");
 }
 };

 const downloadBadge = async () => {
 if (!badgeRef.current) return;
 setDownloading(true);
 try {
 const canvas = await html2canvas(badgeRef.current, {
 scale: 2,
 backgroundColor: null,
 useCORS: true,
 logging: false,
 });
 const link = document.createElement("a");
 link.download = `certificat-cloudmature-${data.verification_code}.png`;
 link.href = canvas.toDataURL("image/png");
 link.click();
 toast.success("Badge téléchargé");
 } catch (e) {
 console.error(e);
 toast.error("Échec du téléchargement");
 } finally {
 setDownloading(false);
 }
 };

 const nativeShare = async () => {
 if (!navigator.share) {
 copyLink();
 return;
 }
 try {
 await navigator.share({ title:"Certificat CloudMature", text: shareText, url: shareUrl });
 } catch {
 /* user cancelled */
 }
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-w-2xl">
 <DialogHeader className="-mx-6 -mt-6 mb-2 px-6 pt-6 pb-4 bg-gradient-primary-deep text-primary-foreground rounded-t-lg text-white">
 <DialogTitle className="text-white flex items-center gap-2">
 <Share2 className="h-5 w-5"/> Partager mon certificat
 </DialogTitle>
 <DialogDescription className="text-white/80">
 Affichez votre réussite sur LinkedIn ou téléchargez un badge prêt à partager.
 </DialogDescription>
 </DialogHeader>

 {/* Preview (visible mini, full-size offscreen for capture) */}
 <div className="rounded-xl overflow-hidden border bg-slate-100 mb-2">
 <div
 className="origin-top-left" style={{
 transform:"scale(0.4)",
 width: 1200,
 height: 630,
 transformOrigin:"top left",
 marginBottom: -378, // 630*0.6
 }}
 >
 <CertificateBadge ref={badgeRef} data={data} />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <Button asChild className="bg-[#0a66c2] hover:bg-[#0a66c2]/90 text-white">
 <a href={linkedInAddToProfile} target="_blank"rel="noopener noreferrer">
 <Linkedin className="h-4 w-4 mr-2"/> Ajouter à mon profil
 </a>
 </Button>
 <Button asChild variant="outline">
 <a href={linkedInShare} target="_blank"rel="noopener noreferrer">
 <Linkedin className="h-4 w-4 mr-2 text-[#0a66c2]"/> Publier sur LinkedIn
 </a>
 </Button>
 <Button asChild variant="outline">
 <a href={twitterShare} target="_blank"rel="noopener noreferrer">
 <Twitter className="h-4 w-4 mr-2"/> Partager sur X
 </a>
 </Button>
 <Button asChild variant="outline">
 <a href={mailto}>
 <Mail className="h-4 w-4 mr-2"/> Envoyer par email
 </a>
 </Button>
 <Button onClick={downloadBadge} disabled={downloading} variant="outline">
 <Download className="h-4 w-4 mr-2"/>
 {downloading ?"Génération…":"Télécharger le badge PNG"}
 </Button>
 <Button onClick={nativeShare} variant="outline">
 <Share2 className="h-4 w-4 mr-2"/> Partage rapide
 </Button>
 </div>

 <div className="mt-3 space-y-1">
 <label className="text-xs text-muted-foreground">Lien public de vérification</label>
 <div className="flex gap-2">
 <Input readOnly value={shareUrl} className="font-mono text-xs"/>
 <Button onClick={copyLink} variant="secondary"size="icon"title="Copier">
 {copied ? <Check className="h-4 w-4 text-emerald-600"/> : <Copy className="h-4 w-4"/>}
 </Button>
 <Button asChild variant="secondary"size="icon"title="Ouvrir">
 <a href={shareUrl} target="_blank"rel="noopener noreferrer">
 <ExternalLink className="h-4 w-4"/>
 </a>
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 );
}
