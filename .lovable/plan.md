

# Déployer le portail pour une autre organisation

## Contexte

Le projet actuel combine un **site web public** (page d'accueil `/`) et un **portail d'administration** (`/admin`, `/portal`, `/auth`, `/mfa`). Pour déployer uniquement la partie portail pour une autre organisation avec un tenant Azure différent, voici les étapes nécessaires.

## Plan

### 1. Supprimer la page d'accueil publique

- Modifier `src/App.tsx` pour rediriger `/` directement vers `/auth` (ou `/portal`) au lieu d'afficher la page Index (site web vitrine).
- Cela élimine le site marketing et présente directement l'interface de connexion.

### 2. Configurer le nouveau tenant Azure

Les secrets Azure sont stockés au niveau backend. Pour une autre organisation :
- Mettre à jour les 3 secrets backend avec les valeurs du nouveau tenant :
  - `AZURE_TENANT_ID` — ID du tenant Azure AD de la nouvelle organisation
  - `AZURE_CLIENT_ID` — ID de l'application enregistrée dans Azure AD
  - `AZURE_CLIENT_SECRET` — Secret de l'application Azure AD
- L'application Azure doit avoir les permissions Microsoft Graph : `Sites.ReadWrite.All`, `Files.ReadWrite.All`

### 3. Options de déploiement

**Option A — Dupliquer le projet Lovable (recommandé)**
1. Créer un nouveau projet Lovable
2. Copier le code source
3. Connecter un nouveau backend Cloud
4. Configurer les nouveaux secrets Azure
5. Exécuter les migrations de base de données
6. Publier

**Option B — Self-hosting**
1. Cloner le repo via GitHub
2. Configurer un projet Supabase séparé avec les mêmes tables/migrations
3. Mettre les variables d'environnement (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) vers le nouveau Supabase
4. Configurer les secrets Azure dans le nouveau Supabase
5. Déployer sur Vercel/Netlify/etc.

### 4. Changement de code minimal requis

Le seul changement de code nécessaire est dans `src/App.tsx` :

```text
Route "/"  →  Rediriger vers /auth au lieu d'afficher <Index />
```

Tout le reste (portail, admin, SharePoint, factures) fonctionne sans modification car la configuration Azure est externalisée dans les secrets backend.

---

**Résumé** : Le portail est déjà découplé du site web. Il suffit de (1) rediriger la route `/` vers `/auth`, (2) créer une nouvelle instance backend, et (3) configurer les secrets Azure du nouveau tenant.

