# Déploiement Azure Static Web Apps (architecture hybride)

> Frontend hébergé sur **Azure Static Web Apps**, backend (DB, Auth, Edge Functions, connecteurs) **reste sur Lovable Cloud**. Aucun secret côté Lovable à migrer.

---

## 1. Pré-requis

- Compte Azure avec abonnement actif
- Repo GitHub connecté au projet Lovable (sync auto bidirectionnel)
- Accès au registrar DNS de `cloudmature.com`

---

## 2. Créer la Static Web App

1. Portail Azure → **Create a resource** → **Static Web App**
2. **Plan** : Free (suffit largement pour démarrer)
3. **Deployment source** : GitHub → autoriser → sélectionner le repo `cloudmature` (ou nom équivalent)
4. **Branch** : `main`
5. **Build presets** : `Custom` avec les valeurs suivantes :

| Champ | Valeur |
|---|---|
| App location | `/` |
| Api location | *(laisser vide)* |
| Output location | `dist` |

6. Cliquer **Review + create** puis **Create**

Azure génère automatiquement un workflow GitHub Actions dans `.github/workflows/azure-static-web-apps-<random>.yml`.

---

## 3. Configurer les variables d'environnement

Dans Azure Portal → ta Static Web App → **Settings** → **Environment variables** → **Add** (pour l'environnement **Production**) :

| Nom | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | `https://zwzazxebufydnaxezngx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOi...` (anon key — publique, sans risque) |
| `VITE_SUPABASE_PROJECT_ID` | `zwzazxebufydnaxezngx` |

> ⚠️ Ces variables doivent aussi être disponibles **au moment du build**. Si le workflow GitHub Actions ne les voit pas, ajoute-les en plus dans **GitHub repo → Settings → Secrets and variables → Actions → Variables**, puis injecte-les dans le step `build` du workflow via `env:`.

---

## 4. Custom domain `cloudmature.com`

### A. Côté Azure
1. Static Web App → **Settings** → **Custom domains** → **Add**
2. Saisir `www.cloudmature.com`
3. Azure fournit un enregistrement de validation (CNAME ou TXT)
4. Répéter pour le domaine apex `cloudmature.com`

### B. Côté DNS (registrar)

| Type | Nom | Valeur | Notes |
|---|---|---|---|
| CNAME | `www` | `<azure-name>.azurestaticapps.net` | Fourni par Azure |
| TXT | `_dnsauth` (ou nom indiqué) | `<token Azure>` | Validation domaine |
| ALIAS / ANAME | `@` | `<azure-name>.azurestaticapps.net` | Apex — si supporté |
| A | `@` | IPs Azure fournies | Sinon, en alternative |

> Si ton registrar ne supporte ni ALIAS ni ANAME, configure une redirection 301 `cloudmature.com → www.cloudmature.com`.

### C. SSL
Provisionné automatiquement par Azure (Let's Encrypt) une fois la validation DNS OK. Compter 5-30 min.

### D. Retirer le custom domain côté Lovable
Une fois le domaine actif sur Azure, va dans **Lovable → Project Settings → Domains** et retire `cloudmature.com` pour éviter tout conflit DNS.

---

## 5. Reconfigurer les URLs autorisées

### Supabase Auth (via Lovable Cloud)
La connexion Google OAuth utilise un broker Lovable qui gère automatiquement les custom domains. **Aucun changement requis** côté config OAuth si tu gardes Lovable Cloud comme backend.

Cependant, ajoute l'URL Azure à la **Site URL** et **Redirect URLs** dans Lovable Cloud → Users → URL Configuration :
- `https://cloudmature.com`
- `https://www.cloudmature.com`
- `https://<azure-name>.azurestaticapps.net` (le hostname Azure par défaut, utile pour les tests)

### Edge Functions CORS
Toutes les Edge Functions du projet utilisent `Access-Control-Allow-Origin: *`, donc aucun changement nécessaire. Si tu veux durcir la sécurité plus tard, remplace par une whitelist explicite incluant `https://cloudmature.com`.

---

## 6. Tests à effectuer après déploiement

- [ ] Page d'accueil charge sur `https://cloudmature.com`
- [ ] Deep link direct (ex. `/admin`) ne renvoie pas 404 (SPA fallback via `staticwebapp.config.json`)
- [ ] Login email/password
- [ ] Login Google OAuth
- [ ] MFA TOTP / SMS (Twilio Edge Function)
- [ ] Dashboard SEO (`gsc-dashboard` via connecteur Google Search Console)
- [ ] SharePoint browser (sharepoint-proxy → Azure AD)
- [ ] Upload fichier onboarding (Storage)
- [ ] Notifications temps réel (Realtime)
- [ ] Envoi email (process-email-queue / Resend)

---

## 7. CI/CD

Le workflow auto-généré par Azure se déclenche à chaque push sur `main`. Comme Lovable sync automatiquement vers GitHub, **toute modification dans Lovable redéploie automatiquement sur Azure** (~2-3 min).

---

## 8. Limites de l'approche hybride

- **Dépendance Lovable Cloud** : si Lovable Cloud subit une panne, ton app aussi
- **Coût** : tu paies Azure (Free tier OK) + usage Lovable Cloud
- **Bande passante** : trafic API transite via `*.supabase.co` (US/EU selon région Lovable Cloud)

Pour s'affranchir totalement de Lovable, voir la note "Migration complète" du plan original (`.lovable/plan.md`).

---

## 9. Rollback

Si problème, restaure le DNS de `cloudmature.com` vers Lovable :

| Type | Nom | Valeur |
|---|---|---|
| A | `@` | `185.158.133.1` |
| A | `www` | `185.158.133.1` |
| TXT | `_lovable` | `lovable_verify=...` (à récupérer dans Lovable) |

Puis reconnecte le domaine dans **Lovable → Project Settings → Domains**.
