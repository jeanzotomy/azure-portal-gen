## Problème

Sur `/pricing`, en GNF/XOF/XAF/CDF, l'appel à l'edge function `create-cinetpay-payment` renvoie **503** parce que CinetPay n'est pas configuré (ou désactivé) dans **Admin → Intégrations → CinetPay**. Le frontend affiche le message générique de Supabase « Edge Function returned a non-2xx status code » au lieu du vrai message renvoyé par la fonction (« CinetPay non configuré… »).

## Cause

Dans `src/hooks/useCinetPayCheckout.tsx`, on fait :

```ts
const { data, error: invokeErr } = await supabase.functions.invoke(...)
if (invokeErr) throw new Error(invokeErr.message);
```

`supabase.functions.invoke` considère tout status ≥ 300 comme une erreur, met `data = null` et renvoie un `FunctionsHttpError` dont `.message` est le texte générique. Le **vrai** JSON (`{ error: "CinetPay non configuré..." }`) est dans `invokeErr.context.json()`.

## Plan

### 1. `src/hooks/useCinetPayCheckout.tsx` — afficher le vrai message d'erreur

- Détecter `FunctionsHttpError` et lire `await invokeErr.context.json()` pour récupérer `error` (et `details` éventuel).
- Fallback sur `invokeErr.message` si le body n'est pas du JSON.
- Renvoyer cette erreur claire dans le state `error` du hook (déjà affiché en rouge sur `PricingPage`).

### 2. `src/pages/PricingPage.tsx` — meilleur affichage de l'erreur

- L'encart d'erreur existe déjà (`cinetpay.error`). On le garde, mais on ajoute :
  - Pour les admins (déjà détectables via `use-admin`), un lien direct « Configurer CinetPay » → `/admin?tab=integrations`.
  - Pour les autres utilisateurs, un message plus humain : « Le paiement Mobile Money est temporairement indisponible. Choisis une devise internationale (CAD/USD/EUR) ou réessaie plus tard. »
- Désactiver les boutons "S'abonner" / "Acheter" tant qu'on est en devise africaine et qu'une erreur 503 a été rencontrée (jusqu'à changement de devise).

### 3. Aucun changement backend

L'edge function renvoie déjà le bon message et le bon status (503). Le problème est purement côté affichage côté client. On ne touche pas à `create-cinetpay-payment` ni à la config CinetPay.

## Détails techniques

```ts
import { FunctionsHttpError } from "@supabase/supabase-js";

if (invokeErr) {
  let msg = invokeErr.message;
  if (invokeErr instanceof FunctionsHttpError) {
    try {
      const body = await invokeErr.context.json();
      if (body?.error) msg = body.error;
    } catch { /* keep generic message */ }
  }
  throw new Error(msg);
}
```

## Hors périmètre

- Configurer effectivement les credentials CinetPay (action user dans `/admin`).
- Modifier les autres hooks d'invocation Supabase (peuvent être traités plus tard si besoin).
