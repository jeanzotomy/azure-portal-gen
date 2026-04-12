

# Ajouter une barre de recherche dans la section Fichiers SharePoint

## Approche

Ajouter un filtre de recherche **côté client** qui filtre les fichiers/dossiers affichés en temps réel par nom. La barre sera placée dans la toolbar existante (à côté des boutons Upload, Nouveau dossier, Refresh).

## Changements

### 1. `src/components/SharePointBrowser.tsx`
- Ajouter un state `searchQuery` (string)
- Ajouter un `Input` avec icône `Search` dans la barre d'outils du file browser
- Filtrer `items` par `searchQuery` avant le rendu (filtre insensible à la casse sur `item.name`)
- Réinitialiser `searchQuery` quand on change de dossier/drive

### 2. Traductions (`src/i18n/en.ts` et `src/i18n/fr.ts`)
- Ajouter `sharepoint.searchFiles` : "Rechercher des fichiers..." / "Search files..."

