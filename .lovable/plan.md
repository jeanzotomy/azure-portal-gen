## Objectif

Sur mobile uniquement, ajouter une **barre de navigation fixe en bas de l'écran** (style application native) avec 4 raccourcis : Accueil, Projets, Candidatures, Profil. Le menu hamburger en haut reste inchangé. Sur tablette et desktop (≥ md), rien ne change : la navbar actuelle reste telle quelle.

## Comportement

- Visible uniquement sur mobile (`md:hidden`)
- Fixée en bas de l'écran (`fixed bottom-0`), au-dessus de tout contenu (`z-40`, sous la navbar `z-50`)
- 4 onglets avec icône + label court :
  - **Accueil** (`Home`) → `/`
  - **Projets** (`FolderKanban`) → `/portal` (onglet projets) ou `/auth` si non connecté
  - **Candidatures** (`Briefcase`) → `/portal` (onglet candidatures) ou `/careers` si non connecté
  - **Profil** (`User`) → `/portal` (onglet profil) ou `/auth` si non connecté
- L'onglet actif est mis en évidence avec la couleur primaire (cyan)
- Style glassmorphism cohérent avec l'identité visuelle (fond semi-transparent, blur, bordure haute subtile)
- Bouton "ScrollToTop" repositionné légèrement plus haut sur mobile pour ne pas chevaucher la bottom nav

## Détails techniques

**Nouveau composant** : `src/components/MobileBottomNav.tsx`
- Utilise `useLocation` + `useAuthSession`
- Détermine l'onglet actif selon `pathname` et `location.hash`/`location.search` (paramètre `?tab=`)
- Pour les liens vers le portail avec onglet spécifique, utilise `/portal?tab=projects|applications|profile`

**Modifications** :
1. `src/components/MobileBottomNav.tsx` (nouveau) — composant bottom nav
2. `src/App.tsx` — montage global du `<MobileBottomNav />` dans `BrowserRouter` (après `ScrollToTop`)
3. `src/components/ScrollToTop.tsx` — ajuster `bottom-6` → `bottom-24 md:bottom-6` pour éviter le chevauchement sur mobile
4. `src/i18n/fr.ts` et `src/i18n/en.ts` — ajouter les clés `mobileNav.home`, `mobileNav.projects`, `mobileNav.applications`, `mobileNav.profile`
5. `src/pages/PortalPage.tsx` — vérifier que l'onglet actif peut être pré-sélectionné via le query param `?tab=` (lecture au montage)
6. Ajouter un padding-bottom global (`pb-20 md:pb-0`) sur les pages principales OU sur `<body>` via `index.css` pour que le contenu ne soit pas masqué par la bottom nav

## Hors scope

- Aucun changement sur le menu desktop (≥ 768px)
- Aucun changement sur le menu hamburger mobile existant (il reste accessible en haut)
- Aucune modification des routes ou de la logique d'authentification
