

# Plan : Site multi-langues (FR / EN)

## Approche

Créer un système i18n léger basé sur un **React Context** avec des fichiers de traduction JSON, sans dépendance externe. Un sélecteur de langue sera ajouté dans la Navbar.

## Étapes

### 1. Créer les fichiers de traduction
- `src/i18n/fr.ts` — toutes les chaînes en français (état actuel)
- `src/i18n/en.ts` — traductions anglaises
- Clés organisées par section : `hero`, `nav`, `services`, `industries`, `whyUs`, `contact`, `footer`, `auth`, `portal`, `admin`

### 2. Créer le contexte i18n
- `src/i18n/LanguageContext.tsx` — Context + Provider avec :
  - État `locale` (`"fr"` | `"en"`) persisté dans `localStorage`
  - Hook `useTranslation()` retournant `{ t, locale, setLocale }`
  - Fonction `t("hero.title")` pour accéder aux traductions

### 3. Intégrer le Provider
- Envelopper `<App>` avec `<LanguageProvider>` dans `src/main.tsx`

### 4. Ajouter le sélecteur de langue dans la Navbar
- Bouton toggle FR/EN (petit drapeau ou texte) à côté du bouton "Portail Client"
- Visible sur desktop et mobile

### 5. Remplacer les textes en dur dans chaque composant
- **Navbar** : liens de navigation
- **HeroSection** : titre animé, description, boutons
- **ServicesSection** : titres, descriptions des services
- **IndustriesSection** : titres, descriptions des industries
- **WhyUsSection** : titres, descriptions des avantages
- **ContactSection** : formulaire, labels, placeholders
- **Footer** : texte copyright
- **AuthPage** : formulaire login/signup/forgot
- **PortalPage** : tableau de bord, profil, messages
- **AdminPage** : interface admin
- **MfaPage** : instructions MFA
- **ResetPasswordPage** : formulaire reset

## Détails techniques
- Aucune librairie externe (pas de react-i18next) — solution ~100 lignes
- Langue par défaut : français
- Persistance via `localStorage` (clé `lang`)
- Tous les composants utilisent `const { t } = useTranslation()` puis `t("cle.sous_cle")`

