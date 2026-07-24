## Objectif

1. Introduire une étape **Proforma** dans le cycle de vie des factures clients, avec **filigrane « FACTURE PROFORMA »** en arrière-plan du PDF. Le filigrane disparaît dès que la facture est **validée** (statut Émise / Payée).
2. Corriger la **perte du formulaire de facture** quand on redimensionne la fenêtre / clique hors du dialog : le dialog se ferme et tout le travail est perdu.

---

## 1. Proforma : statut + filigrane

### Base de données
Migration SQL : ajouter la valeur `'proforma'` à l'enum `public.service_invoice_status` (avant `'emise'` dans l'ordre logique). Rendre `'proforma'` le nouveau statut par défaut à la création via le formulaire (le default SQL reste `'brouillon'` pour compatibilité).

Ajuster le trigger `en_retard` (ligne 213 de la 1ʳᵉ migration) : ne déclencher que si `status = 'emise'` (déjà le cas), donc pas d'impact.

### UI / Types
- `src/components/ServiceInvoicesTab.tsx` : étendre `InvoiceRow["status"]` avec `"proforma"` et ajouter l'entrée dans `STATUS_LABELS` (libellé « Proforma », classe ambre `bg-amber-500/10 text-amber-600`). Ajouter l'option dans le `<Select>` de changement de statut et le filtre.
- `src/components/PortalInvoicesTab.tsx` : ajouter `proforma` au `STATUS_MAP` (state = `"open"`, non payable en ligne — bouton « Payer » masqué tant que proforma).
- `src/components/ServiceInvoiceForm.tsx` :
  - `handleSave` accepte désormais `"brouillon" | "proforma" | "emise"`.
  - Renommer le bouton principal actuel « Émettre & Générer » → deux boutons :
    - **« Enregistrer proforma »** (sauve `status='proforma'`, génère le PDF avec filigrane).
    - **« Valider & Émettre »** (sauve `status='emise'`, PDF sans filigrane) — visible uniquement en édition d'une proforma existante ou pour les admins.
  - Le bouton « Brouillon » reste inchangé.

### PDF (`src/components/InvoicePDFTemplate.tsx`)
- Étendre `InvoicePDFData` avec `is_proforma?: boolean`.
- Injecter dans le conteneur racine un overlay filigrane (position absolue, rotation -30°, opacité ~0.08, texte « FACTURE PROFORMA », `pointer-events:none`) rendu uniquement si `is_proforma === true`.
- Depuis `ServiceInvoiceForm` et `PortalInvoicesTab` : passer `is_proforma: status === 'proforma'` dans `buildPdfData` / mapping du détail. Idem `PortalInvoicesTab` détail : filigrane visible tant que `detailRow.status === 'proforma'`.
- Adapter le titre visible du PDF : « FACTURE PROFORMA N°… » vs « FACTURE N°… ».

### Nommage fichier & SharePoint
`sanitizeName` : préfixer `Proforma_` au lieu de `Facture_` quand `status === 'proforma'` (dossier SharePoint identique, seul le nom de fichier change).

---

## 2. Fix perte de saisie du formulaire facture

**Cause confirmée par lecture** (`ServiceInvoiceForm.tsx` ligne 382) : `<Dialog open={open} onOpenChange={onOpenChange}>` sans garde. Radix ferme automatiquement le dialog sur :
- clic hors du `DialogContent` (overlay),
- appui sur `Échap`,
- interactions de redimensionnement qui déplacent le focus.

Comme le state (`clients`, `items`, `payment`, `notes`, `discountRate`, etc.) vit dans le composant enfant, la fermeture démonte tout et détruit la saisie.

### Correctifs (dans `ServiceInvoiceForm.tsx`)

1. **Bloquer la fermeture non intentionnelle** sur le `DialogContent` :
   ```tsx
   <DialogContent
     onPointerDownOutside={(e) => e.preventDefault()}
     onInteractOutside={(e) => e.preventDefault()}
     onEscapeKeyDown={(e) => {
       if (isDirty) e.preventDefault();
     }}
     ...
   >
   ```
2. **Détecter la saisie non enregistrée** (`isDirty`) via un `useRef`/state mis à `true` dès qu'un champ change, remis à `false` après sauvegarde réussie.
3. **Intercepter `onOpenChange`** au niveau du `<Dialog>` :
   ```tsx
   onOpenChange={(v) => {
     if (!v && isDirty && !confirm("Fermer sans enregistrer ? Les modifications seront perdues.")) return;
     onOpenChange(v);
   }}
   ```
   Cela protège aussi contre les fermetures programmatiques.
4. **Persistance de secours** (protection ceinture-bretelles contre le démontage / rafraîchissement) : sauver le state complet du formulaire dans `sessionStorage` sous une clé `serviceInvoiceForm:<editId ?? "new">` à chaque changement (debounce 400 ms), et le restaurer à l'ouverture. Purger la clé après `handleSave` réussi ou clic explicite « Annuler ».
5. Bouton **« Annuler »** (ligne 699) : appeler `onOpenChange(false)` en sautant la garde `isDirty` via un flag interne, puis purger le sessionStorage.

---

## Détails techniques

**Fichiers touchés**
- Nouveau : `supabase/migrations/<timestamp>_add_proforma_status.sql`
- `src/components/ServiceInvoiceForm.tsx` (dirty tracking, garde onOpenChange, sessionStorage, nouveau bouton)
- `src/components/ServiceInvoicesTab.tsx` (statut proforma dans map/filtre/select)
- `src/components/InvoicePDFTemplate.tsx` (overlay filigrane, titre dynamique)
- `src/components/PortalInvoicesTab.tsx` (statut proforma, filigrane dans preview PDF, désactivation bouton Payer)

**Migration**
```sql
ALTER TYPE public.service_invoice_status ADD VALUE IF NOT EXISTS 'proforma' BEFORE 'emise';
```
(Postgres exige `ADD VALUE` hors transaction — la migration ne contiendra que cette instruction pour éviter l'erreur `ALTER TYPE ... ADD cannot run inside a transaction block` si besoin, on encapsule via `COMMIT; ALTER TYPE ...; BEGIN;` — le runner Supabase gère `ADD VALUE` seul.)

**Aucune modification** des flux de paiement en ligne, RLS, ou logique de recouvrement.
