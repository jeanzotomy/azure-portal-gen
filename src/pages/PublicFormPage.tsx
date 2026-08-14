import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSeo } from "@/hooks/use-seo";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FormRenderer } from "@/components/marketing/FormRenderer";
import { Loader2, LockKeyhole } from "lucide-react";
import type { MarketingForm, MarketingFormField } from "@/lib/marketing-forms";

interface Props {
  /** Alias de route : `/audit-licences-microsoft` pointe sur un slug fixe. */
  slug?: string;
}

export default function PublicFormPage({ slug: fixedSlug }: Props) {
  const params = useParams<{ slug: string }>();
  const slug = fixedSlug ?? params.slug ?? "";

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<MarketingForm | null>(null);
  const [fields, setFields] = useState<MarketingFormField[]>([]);
  const [closedReason, setClosedReason] = useState<string | null>(null);

  useSeo({
    title: form ? `${form.title} | Cloud Mature` : "Formulaire | Cloud Mature",
    description:
      form?.description?.slice(0, 160) ||
      "Répondez à ce formulaire Cloud Mature : nos conseillers reviennent vers vous rapidement.",
    path: fixedSlug ? `/${fixedSlug}` : `/f/${slug}`,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: formData } = await supabase
        .from("marketing_forms")
        .select("*")
        .eq("slug", slug)
        .eq("status", "publiee")
        .maybeSingle();

      if (cancelled) return;
      if (!formData) { setForm(null); setLoading(false); return; }

      const { data: fieldData } = await supabase
        .from("marketing_form_fields")
        .select("*")
        .eq("form_id", formData.id)
        .order("position", { ascending: true });

      if (cancelled) return;
      setForm(formData);
      setFields(fieldData ?? []);

      // Fermeture par date ou par plafond de soumissions
      if (formData.closes_at && new Date(formData.closes_at).getTime() < Date.now()) {
        setClosedReason("La période de réponse à ce formulaire est terminée.");
      } else if (formData.max_submissions) {
        const { count } = await supabase
          .from("marketing_form_submissions")
          .select("id", { count: "exact", head: true })
          .eq("form_id", formData.id)
          .eq("completed", true);
        if (!cancelled && (count ?? 0) >= formData.max_submissions) {
          setClosedReason("Ce formulaire a atteint son nombre maximal de réponses.");
        }
      }
      setLoading(false);

      // Suivi de la campagne rattachée
      if (formData.campaign_id) {
        const p = new URLSearchParams(window.location.search);
        await supabase.from("campaign_events").insert({
          campaign_id: formData.campaign_id,
          type: "view",
          source: p.get("utm_source"),
          utm: {
            utm_source: p.get("utm_source"),
            utm_medium: p.get("utm_medium"),
            utm_campaign: p.get("utm_campaign"),
          },
          user_agent: navigator.userAgent,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6">
        {loading && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && !form && (
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <LockKeyhole className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-bold text-foreground">Formulaire indisponible</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ce formulaire n'existe pas ou n'est plus publié. Écrivez-nous à{" "}
              <a href="mailto:info@cloudmature.com" className="font-medium text-primary underline underline-offset-4">
                info@cloudmature.com
              </a>{" "}
              et nous vous aiderons.
            </p>
          </div>
        )}

        {!loading && form && closedReason && (
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-foreground">{form.title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{closedReason}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Contactez-nous à{" "}
              <a href="mailto:info@cloudmature.com" className="font-medium text-primary underline underline-offset-4">
                info@cloudmature.com
              </a>{" "}
              pour poursuivre votre démarche.
            </p>
          </div>
        )}

        {!loading && form && !closedReason && <FormRenderer form={form} fields={fields} />}
      </main>
      <Footer />
    </div>
  );
}
