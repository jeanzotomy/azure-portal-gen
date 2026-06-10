import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { useSeo } from "@/hooks/use-seo";
import { MarketingPage, findPage, BASE_URL } from "@/content/marketing-pages";

/**
 * Rendu générique d'une page marketing à partir de la source de contenu unique.
 * Le pré-rendu statique (scripts/prerender-content.ts) produit le même contenu
 * en HTML pour les moteurs ; ce composant fournit la version interactive.
 */
export function ContentPage({ page }: { page: MarketingPage }) {
  const path = `/${page.slug}`;
  useSeo({ title: page.title, description: page.description, path });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.h1,
    description: page.description,
    provider: { "@type": "Organization", name: "CloudMature", url: `${BASE_URL}/` },
    areaServed: ["GN", "SN", "CI", "ML", "BF", "TG", "BJ", "NE"],
    url: `${BASE_URL}${path}`,
  };

  return (
    <div className="min-h-screen">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Navbar />

      <main className="container pt-28 pb-16 max-w-3xl">
        <nav aria-label="Fil d'Ariane" className="text-sm text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          {page.slug.startsWith("services/") ? (
            <>
              <Link to="/services" className="hover:text-primary">Services</Link>
              <span className="mx-2">/</span>
              <span>{page.h1}</span>
            </>
          ) : (
            <span>{page.h1}</span>
          )}
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold mb-4">{page.h1}</h1>
        <p className="text-lg text-muted-foreground mb-10">{page.intro}</p>

        {page.sections.map((s, i) => (
          <section key={i} className="mb-10">
            <h2 className="text-2xl font-semibold mb-3">{s.h2}</h2>
            {s.paragraphs.map((p, j) => (
              <p key={j} className="text-base text-foreground/90 mb-3 leading-relaxed">{p}</p>
            ))}
            {s.bullets && (
              <ul className="list-disc pl-6 space-y-2 text-foreground/90">
                {s.bullets.map((b, k) => (
                  <li key={k}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {page.related && page.related.length > 0 && (
          <section className="mb-4 border-t border-border/40 pt-6">
            <h2 className="text-xl font-semibold mb-3">À découvrir aussi</h2>
            <ul className="space-y-2">
              {page.related.map((slug) => {
                const r = findPage(slug);
                if (!r) return null;
                return (
                  <li key={slug}>
                    <Link to={`/${slug}`} className="text-primary hover:underline">{r.h1}</Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>

      <ContactSection />
      <Footer />
    </div>
  );
}
