

## Pourquoi `lovable.app` apparaît au partage

Quand vous partagez le site sur les réseaux sociaux (LinkedIn, Facebook, WhatsApp, X…), ces plateformes affichent l'URL **canonique** déclarée dans le HTML. Or dans `index.html`, la balise canonique pointe encore vers le sous-domaine de prévisualisation Lovable :

```html
<link rel="canonical" href="https://azure-portal-gen.lovable.app/" />
```

Comme votre domaine officiel est désormais **cloudmature.com** (déjà connecté), cette balise envoie un signal contradictoire — résultat : les aperçus sociaux et Google indexent `azure-portal-gen.lovable.app` au lieu de `cloudmature.com`.

Il manque aussi les balises `og:url` et `og:site_name`, qui aident les réseaux sociaux à afficher correctement le nom du site source.

## Correctifs à appliquer dans `index.html`

1. **Mettre à jour la balise canonique** vers le domaine officiel :
   ```html
   <link rel="canonical" href="https://cloudmature.com/" />
   ```

2. **Ajouter `og:url`** (URL officielle affichée par Facebook/LinkedIn/WhatsApp) :
   ```html
   <meta property="og:url" content="https://cloudmature.com/" />
   ```

3. **Ajouter `og:site_name`** (nom de marque affiché sous le titre) :
   ```html
   <meta property="og:site_name" content="CloudMature" />
   ```

4. **Ajouter `twitter:domain`** pour que X affiche `cloudmature.com` :
   ```html
   <meta name="twitter:domain" content="cloudmature.com" />
   ```

## Après le déploiement

Les caches sociaux conservent l'ancienne version pendant plusieurs jours. Pour forcer la mise à jour immédiate après publication :

- **Facebook / WhatsApp / Instagram** : passer l'URL dans le [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) → cliquer **« Scrape Again »**.
- **LinkedIn** : utiliser le [Post Inspector](https://www.linkedin.com/post-inspector/).
- **X (Twitter)** : le cache se rafraîchit automatiquement après quelques heures.

## Fichier modifié

- `index.html` (4 lignes ajoutées/modifiées dans `<head>`)

Aucune modification de code applicatif, base de données ou configuration backend n'est nécessaire.

