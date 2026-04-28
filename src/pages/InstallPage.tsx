import { useTranslation } from "@/i18n/LanguageContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Share, MoreVertical, PlusSquare, Download, Smartphone } from "lucide-react";
import iconIphone from "@/assets/icon-iphone.png";
import iconAndroid from "@/assets/icon-android.png";

export default function InstallPage() {
  const { t } = useTranslation();

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

        {/* iOS */}
        <section className="rounded-xl glass p-5 sm:p-6 space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-primary-foreground flex items-center gap-2">
            <img src={iconIphone} alt="iPhone" loading="lazy" width={80} height={80} className="w-20 h-20 object-contain drop-shadow-lg" />
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
            <img src={iconAndroid} alt="Android" loading="lazy" width={80} height={80} className="w-20 h-20 object-contain drop-shadow-lg" />
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
      </main>
      <Footer />
    </div>
  );
}
