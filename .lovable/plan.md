
Remplacer le carrousel d'images par la vidéo jointe.

## Plan

1. **Sauvegarder la vidéo** dans `src/assets/hero-video.mp4` (depuis l'upload utilisateur).
2. **Refactoriser `src/components/HeroScreenCarousel.tsx`**:
   - Supprimer toutes les images et l'array `slides`.
   - Supprimer la logique d'auto-rotation (`useState`, `useEffect`, `setInterval`).
   - Supprimer les indicateurs (dots) et le label de slide.
   - Garder le cadre "moniteur" (bezel haut avec les 3 points rouge/jaune/vert, support, ombres/glow) pour conserver l'esthétique actuelle.
   - Remplacer la zone d'écran par une balise `<video>` HTML standard avec : `autoPlay`, `muted`, `loop`, `playsInline`, `controls={false}`, et `className="w-full h-full object-cover"` pour remplir l'écran 16:9.
3. **Conserver** : ratio 16/9, bordures, glow, animation `animate-fade-up`, et le composant reste utilisé tel quel dans `src/pages/Index.tsx` (aucun changement requis là).

## Note technique
- Utiliser la balise HTML `<video>` native (pas besoin de librairie).
- Garder l'image `dashboard-presentation.png` comme `poster` pour l'affichage avant chargement.
- Le nom du composant `HeroScreenCarousel` reste inchangé pour éviter les ruptures d'imports.

## Fichiers modifiés
- `src/assets/hero-video.mp4` (nouveau)
- `src/components/HeroScreenCarousel.tsx` (refonte)
