# Déploiement Azure depuis Git — Impact sur tes connecteurs

## TL;DR

Ton repo Git contient **le code**, mais **pas les secrets ni l'infrastructure** Lovable Cloud. Si tu déploies tel quel sur Azure sans rien d'autre, l'app **ne fonctionnera pas** : pas de DB, pas d'auth, pas de connecteurs.

Recommandation : **Frontend sur Azure Static Web Apps + backend qui reste sur Lovable Cloud**. C'est le chemin avec 90% du gain pour 10% de l'effort. Migration complète possible plus tard.

---

## Ce qui est dans Git vs ce qui n'y est pas

**Présent dans Git :**
- Code React/Vite (`src/`)
- Code Edge Functions (`supabase/functions/*`)
- Migrations SQL (`supabase/migrations/`)
- `supabase/config.toml`
- Références aux env vars (`Deno.env.get(...)`, `import.meta.env.VITE_*`)

**Absent (vit côté Lovable Cloud) :**
- Tous les secrets : `LOVABLE_API_KEY`, `GOOGLE_SEARCH_CONSOLE_API_KEY`, `AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET`, `TWILIO_*`, etc.
- La base Postgres + données + RLS exécutées
- L'auth Supabase (utilisateurs, sessions, OAuth Google configuré)
- Le storage (buckets, fichiers)
- Le routage vers `connector-gateway.lovable.dev`

---

## Comportement par connecteur après déploiement Azure

| Connecteur | Type | Sur Azure (sans Lovable) |
|---|---|---|
| **Azure AD / SharePoint** (`sharepoint-proxy`) | Tes credentials Azure directs | ✅ Marche partout, recopier `AZURE_*` |
| **Twilio SMS** (MFA) | Clé API directe | ✅ Marche, recopier les clés |
| **Resend / Email** | Clé API directe | ✅ Marche, recopier la clé |
| **Google Search Console** (`gsc-dashboard`) | Via gateway Lovable | ❌ Cassé — nécessite `LOVABLE_API_KEY` + connexion liée |
| **Lovable AI Gateway** (si utilisé) | Via gateway Lovable | ❌ Cassé — à remplacer par OpenAI/Gemini direct |
| **Google OAuth signin** (`@lovable.dev/cloud-auth-js`) | Via Lovable Auth | ❌ Cassé — à remplacer par Supabase OAuth natif |
| **DB Postgres + RLS + triggers** | Lovable Cloud (Supabase managé) | ❌ Aucune DB côté Azure tant que rien n'est recréé |

---

## Plan recommandé — Architecture hybride

```text
       ┌──────────────────────────┐
       │  Azure Static Web Apps   │  ← build Vite déployé via GitHub Actions
       │   (cloudmature.com)      │
       └────────────┬─────────────┘
                    │ HTTPS
                    ▼
       ┌──────────────────────────┐
       │   Lovable Cloud backend  │
       │  - Supabase DB + Auth    │
       │  - Edge Functions        │
       │  - Connecteurs (GSC...)  │
       │  - Storage               │
       └──────────────────────────┘
```

**Avantages :**
- Connecteurs gateway (GSC, AI) continuent de marcher sans refonte
- Custom domain `cloudmature.com` géré par Azure (CDN + SSL gratuit)
- CI/CD automatique via GitHub Actions
- Aucun secret à migrer
- Tu peux toujours éditer dans Lovable, les changes sync via Git

**À faire (étapes haut niveau) :**

1. **Vérifier les origines CORS autorisées** dans les Edge Functions (déjà `*` partout → OK)
2. **Créer une Azure Static Web App** liée au repo GitHub
3. **Configurer le build** : framework Vite, output `dist/`, app location `/`
4. **Ajouter les env vars publiques** côté Azure (Build Configuration) :
   - `VITE_SUPABASE_URL` = `https://zwzazxebufydnaxezngx.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = la clé anon publique
   - `VITE_SUPABASE_PROJECT_ID` = `zwzazxebufydnaxezngx`
5. **Configurer le SPA fallback** (`staticwebapp.config.json` à la racine) pour que React Router gère les deep links
6. **Pointer `cloudmature.com`** vers le Static Web App Azure (DNS) au lieu de Lovable
7. **Reconfigurer Google OAuth** côté Supabase : ajouter l'URL Azure dans les Redirect URLs autorisées
8. **Tester** : auth, MFA, SharePoint, GSC, notifications, paiements

---

## Si plus tard tu veux la migration complète

À prévoir comme chantier séparé (non couvert ici) :
- Self-hosting Supabase sur Azure Container Apps OU bascule vers Azure Database for PostgreSQL + Azure Functions (Deno → Node)
- Remplacer `gsc-dashboard` par appel direct GSC avec service account Google
- Remplacer `@lovable.dev/cloud-auth-js` par flux OAuth Supabase natif
- Réécrire toutes les RLS et triggers dans la nouvelle DB
- Migrer données via `pg_dump` / `pg_restore`
- Reconfigurer le hook `auth-email-hook` côté nouveau Supabase

C'est 2-4 semaines de travail vs 1 journée pour le scénario hybride.

---

## Détails techniques (pour ton équipe technique)

**Fichier à créer : `staticwebapp.config.json`**
```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/*.{css,js,svg,png,jpg,webp,ico,xml,txt,json}"]
  },
  "globalHeaders": {
    "Cache-Control": "no-cache"
  }
}
```

**GitHub Actions workflow** : Azure Static Web Apps génère automatiquement `.github/workflows/azure-static-web-apps-*.yml` lors de la création de la ressource. Vérifier `app_build_command: "npm run build"` et `output_location: "dist"`.

**Variables d'env côté Azure** : Settings → Configuration → Application settings (préfixe `VITE_` pour qu'elles soient injectées au build).

**DNS pour `cloudmature.com`** :
- Type `CNAME` : `www` → `<azure-swa-hostname>.azurestaticapps.net`
- Type `TXT` : validation domaine (fourni par Azure)
- Apex (`@`) : utiliser `ALIAS`/`ANAME` si supporté, sinon redirection 301 vers `www`

**Aucun changement nécessaire** dans les Edge Functions, les migrations, le code React, ou les secrets Lovable.

---

## Question

Confirmes-tu cette approche hybride ? Si oui, je peux préparer le `staticwebapp.config.json` et documenter la procédure DNS exacte pour `cloudmature.com`.
