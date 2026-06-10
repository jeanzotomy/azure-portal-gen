import { useParams } from "react-router-dom";
import { ContentPage } from "@/components/ContentPage";
import { findPage } from "@/content/marketing-pages";
import NotFound from "@/pages/NotFound";

// /services
export function ServicesHubPage() {
  const page = findPage("services");
  if (!page) return <NotFound />;
  return <ContentPage page={page} />;
}

// /services/:slug
export function ServiceDetailPage() {
  const { slug } = useParams();
  const page = findPage(`services/${slug ?? ""}`);
  if (!page) return <NotFound />;
  return <ContentPage page={page} />;
}
