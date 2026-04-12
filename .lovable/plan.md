

# Correction de la redirection post-authentification

## Problème identifié

Après connexion via **Google OAuth**, le `redirect_uri` est défini sur `window.location.origin` (c'est-à-dire `/`), ce qui ramène l'utilisateur sur la **page d'accueil** au lieu de le diriger vers `/mfa` puis vers son portail. La page Index ne contient aucune logique de détection d'utilisateur connecté.

Pour la connexion **email/mot de passe**, `navigate("/mfa")` fonctionne correctement.

## Solution

### 1. Modifier `AuthPage.tsx` — Google OAuth redirect
Changer le `redirect_uri` de `window.location.origin` à `window.location.origin + "/mfa"` pour que l'utilisateur soit redirigé vers la page MFA après l'authentification Google.

### 2. Ajouter une détection sur la page Index
Ajouter une vérification dans `Index.tsx` : si un utilisateur est déjà authentifié (session active), le rediriger automatiquement vers `/mfa` (qui gère ensuite la redirection vers `/portal` ou `/admin` selon le rôle). Cela couvre le cas où l'utilisateur revient sur `/` alors qu'il est déjà connecté.

## Fichiers modifiés
- `src/pages/AuthPage.tsx` — changer `redirect_uri`
- `src/pages/Index.tsx` — ajouter détection de session et redirection

