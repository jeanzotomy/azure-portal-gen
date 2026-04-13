

# Plan : Convertir l'app en PWA (Application Web Installable)

## Ce que ça va faire

Vos utilisateurs pourront **installer l'app directement depuis leur navigateur** sur leur téléphone (iPhone ou Android), comme une vraie application. Elle apparaîtra sur l'écran d'accueil avec votre logo CloudMature. Pas besoin de passer par l'App Store ou le Play Store.

---

## Étapes techniques

### 1. Créer le fichier `public/manifest.json`
Fichier de configuration PWA qui décrit l'application (nom, couleurs, icônes, mode d'affichage plein écran).

### 2. Générer les icônes PWA
Créer les icônes aux tailles requises (192x192, 512x512) à partir du `favicon.png` existant et les placer dans `public/`.

### 3. Mettre à jour `index.html`
Ajouter les balises meta nécessaires pour mobile :
- Lien vers le manifest
- `apple-mobile-web-app-capable` et `apple-mobile-web-app-status-bar-style` pour iOS
- `theme-color` pour la barre de navigation mobile

### 4. Créer une page `/install`
Page dédiée avec un bouton d'installation et des instructions visuelles pour guider les utilisateurs (sur iOS : Partager → Ajouter à l'écran d'accueil, sur Android : menu du navigateur).

### 5. Ajouter un lien d'installation dans le Navbar
Bouton discret "Installer l'app" visible uniquement sur mobile.

---

## Pas de service worker
Cette approche n'utilise **pas** de service worker ni de `vite-plugin-pwa`, ce qui évite les problèmes de cache et reste simple. L'app nécessitera une connexion internet pour fonctionner (ce qui est normal pour votre portail client/admin).

## Résultat
Après publication, vos utilisateurs mobiles pourront installer l'app en un clic et y accéder comme une application native depuis leur écran d'accueil.

