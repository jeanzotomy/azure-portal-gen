

## Plan : Intégration SharePoint dans le portail

### Contexte

SharePoint est accessible via l'API Microsoft Graph. Le connecteur **Microsoft OneDrive** disponible dans Lovable utilise cette même API et peut accéder aux sites SharePoint, bibliothèques de documents et listes.

### Architecture

```text
Portail Client (React)
    │
    ▼
Edge Function "sharepoint-proxy"
    │
    ▼
Connector Gateway (Microsoft OneDrive)
    │
    ▼
Microsoft Graph API → SharePoint
```

### Étapes

**1. Connecter le connecteur Microsoft OneDrive**
- Lier le connecteur `microsoft_onedrive` au projet (il donne accès à l'API Microsoft Graph, incluant SharePoint)
- Vérifier que les scopes SharePoint nécessaires sont inclus (`Sites.Read.All`, `Sites.ReadWrite.All`, `Files.ReadWrite.All`)

**2. Créer une Edge Function `sharepoint-proxy`**
- Proxy sécurisé vers le connector gateway pour les appels Microsoft Graph
- Endpoints supportés :
  - `GET /sites` — lister les sites SharePoint
  - `GET /sites/{id}/drive/root/children` — parcourir les fichiers d'une bibliothèque
  - `GET /sites/{id}/lists` — lister les listes SharePoint
  - `GET /sites/{id}/lists/{listId}/items` — lire les éléments d'une liste
  - `POST /sites/{id}/drive/root:/{path}:/content` — uploader un fichier
  - `GET /sites/{id}/drive/items/{itemId}/content` — télécharger un fichier
- Validation JWT pour sécuriser l'accès

**3. Ajouter un onglet "SharePoint" dans le portail client**
- Nouvel onglet dans la sidebar du `PortalPage`
- Vue explorateur de fichiers avec navigation par dossiers
- Bouton d'upload pour envoyer des fichiers vers SharePoint
- Affichage des listes SharePoint sous forme de tableaux
- Possibilité de lier un dossier SharePoint à un projet existant

**4. Synchronisation projets ↔ SharePoint**
- Ajouter un champ `sharepoint_folder_url` à la table `projects` (migration DB)
- Dans l'onglet projets, option de lier/délier un dossier SharePoint
- Afficher les fichiers SharePoint directement dans la fiche projet

**5. Table de configuration SharePoint (migration DB)**
- Table `sharepoint_config` pour stocker le site ID par défaut et les mappings projet-dossier
- Politiques RLS pour que seuls les utilisateurs authentifiés accèdent à leur config

### Limites

- Le connecteur authentifie **votre compte Microsoft** (celui qui configure la connexion), pas chaque utilisateur final individuellement
- Si chaque utilisateur doit accéder à **son propre** SharePoint, il faudrait implémenter un flux OAuth per-user (plus complexe)

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `supabase/functions/sharepoint-proxy/index.ts` | Créer |
| `src/pages/PortalPage.tsx` | Modifier (ajouter onglet SharePoint) |
| `src/components/SharePointBrowser.tsx` | Créer |
| `src/components/SharePointLists.tsx` | Créer |
| Migration DB | Ajouter `sharepoint_folder_url` à `projects` + table `sharepoint_config` |

