## Objectif

Depuis la liste des factures (portail admin/comptable/gestionnaire), pouvoir envoyer une facture au client en un clic : par **email** (avec le PDF joint via lien sécurisé) et/ou par **WhatsApp** (message + lien de téléchargement).

## Fonctionnement

1. Nouveau bouton « Envoyer » (icône Send) sur chaque facture, en vue tableau et en vue carte, à côté d'Aperçu / Télécharger / Dupliquer.
2. Il ouvre une boîte de dialogue « Envoyer la facture » avec :
   - un sélecteur de canal : Email, WhatsApp, ou les deux ;
   - l'email et le téléphone du client pré-remplis depuis sa fiche (modifiables) ;
   - un objet et un message pré-remplis en français (numéro de facture, montant, échéance), modifiables ;
   - un bouton Envoyer avec état de chargement et retour toast.
3. À l'envoi, le PDF est généré comme pour le téléchargement (même rendu, préfixe Facture / Proforma / Reçu), déposé dans un espace de stockage privé dédié aux factures, et un lien signé (30 jours) est créé.
4. Email : envoyé via la fonction d'envoi d'emails déjà en place, avec un nouveau modèle « facture » aux couleurs du site (numéro, date, échéance, total, bouton de téléchargement).
5. WhatsApp : envoyé via la fonction Twilio existante, message texte contenant le récapitulatif et le lien de téléchargement.
6. Traçabilité : la date du dernier envoi est enregistrée sur la facture et affichée dans la liste (« Envoyée le … »).

## Détails techniques

- Nouveau composant `src/components/invoices/SendInvoiceDialog.tsx` ; intégration dans `src/components/ServiceInvoicesTab.tsx` (tableau + cartes).
- Réutilisation de la logique de `InvoiceQuickDownloadButton` (chargement complet facture + items + client + moyens de paiement, rendu hors écran de `InvoicePDFTemplate`, `generateInvoicePDFBlob`) — extraction dans un helper partagé pour éviter la duplication.
- Nouveau bucket privé `invoice-documents` + policies RLS (écriture/lecture staff : admin, comptable, gestionnaire), lien signé côté client.
- Nouveau modèle email `supabase/functions/_shared/transactional-email-templates/invoice-delivery.tsx` + enregistrement dans `registry.ts`, puis déploiement des fonctions concernées.
- WhatsApp : appel de `send-whatsapp-message` (déjà restreinte admin/agent/gestionnaire) ; si le rôle comptable doit aussi envoyer, ajout de `comptable` et `hr` à la liste des rôles autorisés de cette fonction.
- Migration : colonnes `sent_at` et `sent_channels` sur `service_invoices` pour la traçabilité.

## Hors périmètre

- Pas de pièce jointe binaire dans l'email (non supporté) : le PDF est transmis par lien de téléchargement sécurisé.
- Pas d'envoi groupé/en masse.
