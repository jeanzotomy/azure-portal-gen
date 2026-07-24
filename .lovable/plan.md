## Objectifs

1. **Notes & conditions dynamiques** dans le PDF (`InvoicePDFTemplate.tsx`) : remplacer le texte codé en dur (« 30 jours ») par un délai calculé à partir de la date d'échéance saisie dans le formulaire, et adapter le contenu selon le type (brouillon / proforma / émise / payée).
2. **Filigranes** : raccourcir « FACTURE PROFORMA » → « PROFORMA », et ajouter un filigrane « PAYÉ » (vert) pour les factures au statut `payee` afin que le PDF serve de reçu.
3. **Bouton « Télécharger PDF »** directement sur la ligne du tableau et la carte de la liste (`ServiceInvoicesTab.tsx`), aux côtés des icônes Éditer / Ouvrir / Supprimer.

---

## 1. Notes & conditions dynamiques

Fichier : `src/components/InvoicePDFTemplate.tsx`

- Étendre `InvoicePDFData` avec `status?: 'brouillon' | 'proforma' | 'emise' | 'payee' | 'en_retard' | 'annulee'` (le composant lit déjà `is_proforma`, on ajoute le statut complet pour le rendu des notes et du filigrane payé).
- Remplacer le bloc de notes par défaut (lignes 463-469) par une fonction `defaultNotes(status, invoice_date, due_date)` :
  - Calcul du délai : `days = due_date ? round((due_date − invoice_date)/86400000) : null`. Si `days` est nul ou négatif, mentionner « à réception ».
  - **Brouillon** : mention « Document de travail — non contractuel. Les montants et conditions restent à valider avant émission. »
  - **Proforma** : « Devis proforma valable 30 jours. Ce document ne constitue pas une facture définitive et ne vaut pas justificatif comptable. Paiement dû au plus tard le {due_date} ({days} jour(s) après émission). »
  - **Émise / En retard** : « Paiement dû au plus tard le {due_date} ({days} jour(s) après émission). Tout retard entraîne des pénalités de 1,5 %/mois. Services soumis aux CGV (www.cloudmature.com). TVA selon la réglementation guinéenne. »
  - **Payée** : « Facture réglée le {paid_at}. Ce document tient lieu de reçu. Merci pour votre confiance. »
  - **Annulée** : « Facture annulée — sans valeur comptable. »
- `data.notes` saisies manuellement restent prioritaires si non vides.

## 2. Filigranes

Fichier : `src/components/InvoicePDFTemplate.tsx`

- Filigrane proforma (lignes 139-169) : remplacer le texte `FACTURE PROFORMA` par `PROFORMA`, agrandir la police (~180px) et garder la rotation −30° et l'opacité 0.10.
- Ajouter un second overlay conditionnel `status === 'payee'` : texte `PAYÉ`, couleur `#16A34A` (vert), même rotation, opacité 0.12, police ~200px. `zIndex: 0`, `pointer-events: none`.
- Le titre reste « FACTURE » (non « FACTURE PROFORMA ») pour éviter le doublon avec le filigrane, mais on garde une petite mention discrète sous le numéro (« Document proforma » / « Reçu de paiement ») pour l'accessibilité impression noir & blanc.

## 3. Bouton « Télécharger PDF » sur la carte / ligne

Fichiers : `src/components/ServiceInvoicesTab.tsx` (+ un nouvel helper minimal).

Approche : réutiliser l'infrastructure existante (`InvoicePDFTemplate` + `generateInvoicePDFBlob` + `sanitizeName`).

- Créer un composant interne `<InvoiceQuickDownloadButton row={r} />` qui :
  1. Charge à la volée le détail complet (`service_invoices`, `service_invoice_items`, `service_clients`, `payment_methods`) — même requêtes que dans `PortalInvoicesTab.openDetail`.
  2. Monte un `<InvoicePDFTemplate>` invisible (`position:fixed; left:-10000px`) dans un ref, appelle `generateInvoicePDFBlob(ref.current)`.
  3. Déclenche le téléchargement : nom de fichier `Proforma_…` si `status==='proforma'`, `Recu_…` si `payee`, sinon `Facture_…`.
  4. Affiche un `<Loader2>` pendant la génération, un toast d'erreur en cas d'échec.
- Ajouter l'icône `Download` de `lucide-react` avant l'icône « Modifier » dans les deux vues (`table` L256-276 et `card` L306-336), avec le même style (`size="icon" variant="ghost"`, tooltip « Télécharger le PDF »).

## Détails techniques

- Fichiers modifiés :
  - `src/components/InvoicePDFTemplate.tsx` (types + notes dynamiques + filigranes).
  - `src/components/ServiceInvoicesTab.tsx` (bouton téléchargement dans les deux vues).
  - `src/components/ServiceInvoiceForm.tsx` : passer `status` (au lieu de seulement `is_proforma`) à `buildPdfData` pour bénéficier des notes adaptées.
  - `src/components/PortalInvoicesTab.tsx` : idem — passer `status: full.status` dans la construction de `data`, pour que le portail client affiche les bonnes notes et le filigrane « PAYÉ ».
- Aucune modification de base de données, RLS ni logique de paiement.
- Pas de nouvelle dépendance.
