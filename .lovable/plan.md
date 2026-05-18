## Diagnostic

L'onglet **SEO** (`/admin`) appelle l'edge function `gsc-dashboard` qui retourne immédiatement `Failed to send a request to the Edge Function`. Vérifications effectuées :

- Le fichier `supabase/functions/gsc-dashboard/index.ts` existe bien dans le projet.
- Aucune ligne de log n'est présente pour cette fonction côté Lovable Cloud → la fonction **n'est jamais invoquée** (elle n'est pas déployée, ou son boot échoue avant tout log).
- Les secrets requis (`LOVABLE_API_KEY`, `GOOGLE_SEARCH_CONSOLE_API_KEY`) sont bien configurés.
- Les CORS, l'auth et la logique paraissent corrects à la lecture du code.

La cause la plus probable est donc un **déploiement manquant ou échoué** de la fonction (cas classique quand la fonction a été créée mais jamais redéployée après un changement de runtime).

## Plan d'action

1. **Redéployer** la fonction `gsc-dashboard` via l'outil de déploiement Supabase.
2. **Tester** immédiatement la fonction avec un appel POST `{ "action": "live" }` en tant qu'admin connecté pour vérifier qu'elle répond avec un 200 et non un 500.
3. **Si le déploiement échoue** (lockfile, import incompatible) :
   - Supprimer un éventuel `deno.lock` parasite.
   - Remplacer l'import `https://esm.sh/@supabase/supabase-js@2.45.0` par le specifier recommandé `npm:@supabase/supabase-js@2` (plus stable sur le runtime edge actuel).
   - Aligner les CORS sur le pattern recommandé (`import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'`) si nécessaire.
4. **Si la fonction répond 5xx** après redéploiement :
   - Lire les logs (`gsc-dashboard`) pour identifier la cause exacte (auth, secret, appel Google).
   - Corriger en conséquence (ex. secret manquant côté connector, format de réponse du gateway).
5. **Valider** dans l'UI en cliquant "Actualiser" sur l'onglet SEO : les KPIs et le graphique 28 jours doivent se peupler.

## Détails techniques

- Aucune modification de schéma de base, ni de RLS, ni de table.
- Aucune modification du composant `SeoTab.tsx` n'est prévue — il appelle déjà correctement `supabase.functions.invoke("gsc-dashboard", ...)`.
- Modification de code uniquement si l'étape 3 ou 4 le révèle nécessaire (et alors uniquement dans `supabase/functions/gsc-dashboard/index.ts`).
- Aucun nouveau secret requis.

## Hors périmètre

- Refonte du dashboard SEO.
- Ajout de nouvelles métriques GSC.
- Configuration du connector Google Search Console (déjà en place).
