# Partage des offres : titre correct même sans republication

## Constat (confirmé)
Les pages de partage par offre ne sont fabriquées qu'au moment de la publication du site. Une offre publiée ou renommée ensuite n'a pas de page propre : WhatsApp/LinkedIn affichent le titre du site jusqu'à la prochaine publication. Même chose si deux offres ont le même titre, ou si la base était injoignable pendant la publication.

## Ce qui change
- Le lien partagé devient `https://www.cloudmature.com/partage/<slug>` (toujours sur votre domaine).
- Cette adresse renvoie vers la fonction de partage existante, qui lit l'offre en direct et fabrique la fiche (titre, description, image) à chaque demande, puis envoie le visiteur humain sur la page de l'offre.
- Les pages générées à la publication restent en place : les adresses `/careers/<slug>` déjà partagées continuent de fonctionner.

## Détails techniques
- `staticwebapp.config.json` : route `/partage/*` → redirection 302 vers `<backend>/functions/v1/job-share?slug=*` (les robots suivent la redirection et lisent les balises de la page finale).
- `supabase/functions/job-share` : vérifier que `og:url`/canonical pointent sur `https://www.cloudmature.com/careers/<slug>` et que la redirection humaine utilise ce domaine ; redéployer.
- `JobDetailPage.tsx` : `socialShareUrl = publicUrl("/partage/" + slug)` ; le bouton « Copier le lien » garde l'adresse `/careers/<slug>`.
- `generate-offer-pages.ts` : journaliser clairement les doublons ignorés (inchangé sinon).
- Mettre à jour `src/test/job-share-link.test.ts` (lien de partage sur le domaine du site, chemin `/partage/`).
- Republication nécessaire une seule fois pour activer la route.
