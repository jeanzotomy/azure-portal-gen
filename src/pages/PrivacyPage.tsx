import { useTranslation } from "@/i18n/LanguageContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  const { t } = useTranslation();
  const sections = t("privacy.sections") as Array<{ title: string; content: string }>;

  return (
    <div className="min-h-screen bg-background">
      <ScrollToTop />
      <Navbar />
      <main className="container py-28 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">{t("privacy.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10">{t("privacy.lastUpdated")}</p>
        <div className="space-y-8">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-xl font-semibold text-foreground mb-3">{s.title}</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{s.content}</p>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
