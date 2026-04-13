import { useTranslation } from "@/i18n/LanguageContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Share, MoreVertical, PlusSquare, Download } from "lucide-react";

export default function InstallPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-24 max-w-2xl mx-auto space-y-10">
        <h1 className="text-3xl font-bold text-center text-foreground">
          {t("install.title")}
        </h1>
        <p className="text-center text-muted-foreground">
          {t("install.subtitle")}
        </p>

        {/* iOS */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            🍎 iPhone / iPad (Safari)
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li className="flex items-start gap-2">
              <Share size={18} className="mt-0.5 shrink-0 text-primary" />
              <span>{t("install.ios1")}</span>
            </li>
            <li className="flex items-start gap-2">
              <PlusSquare size={18} className="mt-0.5 shrink-0 text-primary" />
              <span>{t("install.ios2")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Download size={18} className="mt-0.5 shrink-0 text-primary" />
              <span>{t("install.ios3")}</span>
            </li>
          </ol>
        </section>

        {/* Android */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            🤖 Android (Chrome)
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li className="flex items-start gap-2">
              <MoreVertical size={18} className="mt-0.5 shrink-0 text-primary" />
              <span>{t("install.android1")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Download size={18} className="mt-0.5 shrink-0 text-primary" />
              <span>{t("install.android2")}</span>
            </li>
          </ol>
        </section>
      </main>
      <Footer />
    </div>
  );
}
