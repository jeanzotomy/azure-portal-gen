import { useTranslation } from "@/i18n/LanguageContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

import { FileText } from "lucide-react";

export default function TermsPage() {
  const { t } = useTranslation();
  const sections = t("terms.sections") as Array<{ title: string; content: string }>;

  return (
    <div className="min-h-screen bg-background">
      
      <Navbar />
      <main className="container py-28 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">{t("terms.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10">{t("terms.lastUpdated")}</p>
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
