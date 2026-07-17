// Mapping entre le nom du service dans `service_catalog` et le priceId Stripe
// créé via l'outil `payments--batch_create_product`.
// Les services absents de cette map n'ont pas de tarif fixe et déclenchent le
// formulaire "Demander un devis".
export const SERVICE_STRIPE_PRICE_MAP: Record<string, string> = {
  "Acquisition de licence Google Business Starter": "google_biz_starter_monthly",
  "Acquisition de licence Google Business Standard": "google_biz_standard_monthly",
  "Acquisition de licence Google Business Plus": "google_biz_plus_monthly",
  "Acquisition de licence Microsoft 365 Business Basic": "m365_biz_basic_monthly",
  "Acquisition de licence Microsoft 365 Business Standard": "m365_biz_standard_monthly",
  "Acquisition de licence Microsoft 365 Business Premium": "m365_biz_premium_monthly",
  "Acquisition de nom de domaine": "domain_acquisition_onetime",
  "Configuration d'environnement Google Workspace": "google_workspace_setup_onetime",
  "Hebergement de site web": "website_hosting_monthly",
  "Developpement de site web wordpress": "wordpress_website_onetime",
  "Developpement de site web pro": "pro_website_onetime",
};

export function getStripePriceIdForService(name: string): string | undefined {
  return SERVICE_STRIPE_PRICE_MAP[name];
}
