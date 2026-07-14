import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "@/i18n/LanguageContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Share, MoreVertical, PlusSquare, Download, Smartphone, Check, ArrowDown, Home, SquarePlus } from "lucide-react";
import iconIphone from "@/assets/icon-iphone.png";
import iconAndroid from "@/assets/icon-android.png";
import { useSeo } from "@/hooks/use-seo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
 prompt: () => Promise<void>;
 userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
 const { t } = useTranslation();
 const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
 const [isInstalled, setIsInstalled] = useState(false);
 const [showManual, setShowManual] = useState(false);

 const checkInstalled = useCallback(() => {
 const nav = window.navigator as Navigator & { standalone?: boolean };
 const standalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
 setIsInstalled(standalone);
 return standalone;
 }, []);

 useEffect(() => {
 const alreadyInstalled = checkInstalled();
 if (alreadyInstalled) {
 toast.info("CloudMature est déjà installée sur votre appareil.", {
 description: "Ouvrez l'application depuis votre écran d'accueil.",
 });
 }

 const handleBeforeInstallPrompt = (e: Event) => {
 e.preventDefault();
 setInstallPrompt(e as BeforeInstallPromptEvent);
 };

 const handleAppInstalled = () => {
 setIsInstalled(true);
 setInstallPrompt(null);
 toast.success("Installation réussie", {
 description: "CloudMature a été ajoutée à votre écran d'accueil.",
 });
 };

 window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
 window.addEventListener("appinstalled", handleAppInstalled);

 const mediaQuery = window.matchMedia("(display-mode: standalone)");
 const handleDisplayModeChange = () => checkInstalled();
 mediaQuery.addEventListener("change", handleDisplayModeChange);

 // iOS Safari et navigateurs sans API n'émètront jamais beforeinstallprompt
 const timer = window.setTimeout(() => setShowManual(true), 800);

 return () => {
 window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
 window.removeEventListener("appinstalled", handleAppInstalled);
 mediaQuery.removeEventListener("change", handleDisplayModeChange);
 clearTimeout(timer);
 };
 }, [checkInstalled]);

 const handleInstall = useCallback(async () => {
 if (!installPrompt) return;
 await installPrompt.prompt();
 const { outcome } = await installPrompt.userChoice;
 if (outcome === "accepted") {
 setIsInstalled(true);
 toast.success("Installation réussie", {
 description: "CloudMature a été ajoutée à votre écran d'accueil.",
 });
 } else {
 toast.info("Installation annulée", {
 description: "Vous pouvez réessayer à tout moment depuis cette page.",
 });
 }
 setInstallPrompt(null);
 }, [installPrompt]);

 useSeo({
    title: "Installer l'application CloudMature sur mobile",
    description: "Guide d'installation de l'application CloudMature en PWA sur iPhone et Android pour un accès rapide à votre portail.",
    path: "/install",
  });

  return (
    <div className="min-h-screen flex flex-col gradient-hero">
      <Navbar />
      <main className="flex-1 container py-24 px-4 sm:px-6 max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4">
            <Smartphone size={28} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-foreground">
            {t("install.title")}
          </h1>
          <p className="text-secondary-foreground/70 text-sm sm:text-base">
            {t("install.subtitle")}
          </p>
 </div>

 {/* Installation native (Chrome/Edge Android/Windows) */}
 {(installPrompt || isInstalled) && (
 <section className="rounded-xl glass p-5 sm:p-6 text-center space-y-4">
 {isInstalled ? (
 <div className="flex flex-col items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
 <Check size={24} className="text-green-500" />
 </div>
 <h2 className="text-lg sm:text-xl font-semibold text-primary-foreground">
 Application installée
 </h2>
 <p className="text-secondary-foreground/70 text-sm">
 Le raccourci CloudMature a été ajouté à votre écran d'accueil.
 </p>
 </div>
 ) : (
 <div className="space-y-4">
 <h2 className="text-lg sm:text-xl font-semibold text-primary-foreground">
 Ajouter CloudMature à votre écran d'accueil
 </h2>
 <p className="text-secondary-foreground/70 text-sm">
 Votre navigateur permet d'installer l'application en un clic.
 </p>
 <Button onClick={handleInstall} size="lg" className="w-full sm:w-auto">
 <Download size={18} className="mr-2" />
 Ajouter à l'écran d'accueil
 </Button>
 </div>
 )}
 </section>
 )}

 {/* Instructions manuelles */}
 {(showManual || !installPrompt) && !isInstalled && (
 <>
 {/* iOS */}
 <section className="rounded-xl glass p-5 sm:p-6 space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-primary-foreground flex items-center gap-2">
            <img src={iconIphone} alt="iPhone Safari install icon" loading="lazy" width={80} height={80} className="w-20 h-20 object-contain drop-shadow-lg -ml-2 mr-1" />
            iPhone / iPad (Safari)
          </h2>
          <ol className="space-y-4 text-secondary-foreground/80 text-sm">
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                <Share size={16} className="text-primary-foreground" />
              </div>
              <span className="pt-1">{t("install.ios1")}</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                <PlusSquare size={16} className="text-primary-foreground" />
              </div>
              <span className="pt-1">{t("install.ios2")}</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                <Download size={16} className="text-primary-foreground" />
              </div>
              <span className="pt-1">{t("install.ios3")}</span>
            </li>
          </ol>
        </section>

        {/* Android */}
        <section className="rounded-xl glass p-5 sm:p-6 space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-primary-foreground flex items-center gap-2">
            <img src={iconAndroid} alt="Android Chrome install icon" loading="lazy" width={80} height={80} className="w-20 h-20 object-contain drop-shadow-lg" />
            Android (Chrome)
          </h2>
          <ol className="space-y-4 text-secondary-foreground/80 text-sm">
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                <MoreVertical size={16} className="text-primary-foreground" />
              </div>
              <span className="pt-1">{t("install.android1")}</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                <Download size={16} className="text-primary-foreground" />
              </div>
              <span className="pt-1">{t("install.android2")}</span>
            </li>
 </ol>
 </section>
 </>
 )}
 </main>
      <Footer />
    </div>
  );
}
