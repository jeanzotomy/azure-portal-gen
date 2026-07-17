## Contexte
L'image montre la section **Industries** du site public. Comparée à la section **Services** (et aux autres sections du site), sa typographie est plus petite :

| Élément | Industries (actuel) | Services (référence) |
|---------|---------------------|----------------------|
| Titre h2 | `text-3xl md:text-4xl` | `text-3xl md:text-5xl` |
| Titre carte | `text-base` | `text-[17px]` |
| Description carte | `text-xs` | `text-sm` |
| Sous-titre / badge | `text-lg` / `text-sm` | `text-lg` / `text-sm` |

## Objectif
Agrandir la police de la section Industries et l'uniformiser avec le reste du site, sans toucher au layout, aux couleurs, aux animations ni aux autres comportements.

## Modifications prévues
Dans `src/components/IndustriesSection.tsx` :

1. **Titre principal** : passer `text-3xl md:text-4xl` en `text-3xl md:text-5xl` pour aligner avec Services.
2. **Titre de carte** : passer `text-base` en `text-[17px]` pour aligner avec `ServiceCard`.
3. **Description de carte** : passer `text-xs` en `text-sm` pour aligner avec `ServiceCard`.
4. **« En savoir plus »** : maintenir `text-xs` (ou passer en `text-sm` si l'ensemble des cartes est agrandi) — à valider visuellement après modification.

## Vérification
- Compilation (`bun run build`) pour s'assurer qu'aucune erreur n'est introduite.
- Aperçu visuel du site pour confirmer que la section Industries est maintenant cohérente avec les autres sections en termes de taille de police.