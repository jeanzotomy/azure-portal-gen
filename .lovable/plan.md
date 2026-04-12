

# Implémentation de l'authentification SMS avec Twilio

Le connecteur Twilio est connecté. Le numéro trial est **+1 641 348-4830**.

## Architecture

L'authentification SMS native de Supabase ne supporte pas Twilio directement via le connecteur gateway. On va donc implémenter un système SMS custom :

1. **Connexion par SMS** : Edge function qui envoie un OTP via Twilio, vérification côté serveur
2. **MFA par SMS** : Alternative au TOTP existant, envoi de code SMS au lieu du QR code

```text
Frontend (AuthPage / MfaPage)
  │
  ▼
Edge Function "send-sms-otp"  ──► Twilio Gateway ──► SMS
Edge Function "verify-sms-otp" ──► Vérifie le code
```

## Étapes

### 1. Créer une table `sms_otp_codes`
Stocke les codes OTP temporaires (phone, code, expires_at, used). RLS service_role uniquement.

### 2. Créer l'edge function `send-sms-otp`
- Génère un code à 6 chiffres, le stocke en base avec expiration 5 min
- Envoie le SMS via le connector gateway Twilio (`/Messages.json`)
- Numéro expéditeur : `+16413484830`

### 3. Créer l'edge function `verify-sms-otp`
- Vérifie le code contre la base de données
- Pour la **connexion SMS** : crée/récupère l'utilisateur par téléphone et retourne un token de session
- Pour le **MFA SMS** : valide le second facteur et élève le niveau AAL

### 4. Modifier `AuthPage.tsx`
- Ajouter un mode **"phone"** : champ numéro de téléphone + bouton "Envoyer le code"
- Après envoi, afficher un champ OTP à 6 chiffres pour vérification
- Bouton toggle entre connexion email et SMS

### 5. Modifier `MfaPage.tsx`
- Ajouter une option **"Vérification par SMS"** en alternative au TOTP
- Utilise le numéro de téléphone du profil utilisateur
- Bouton pour envoyer le code SMS + champ de saisie OTP

### 6. Ajouter les traductions FR/EN
Nouvelles clés pour : `auth.phoneLogin`, `auth.sendSmsCode`, `auth.enterSmsCode`, `mfa.smsOption`, `mfa.sendSmsCode`, etc.

## Détails techniques
- Le numéro Twilio trial `+16413484830` sera stocké en dur dans l'edge function (ou en secret si préféré)
- Les codes OTP expirent après 5 minutes
- Rate limiting : max 3 tentatives par téléphone par 10 minutes
- **Limitation trial Twilio** : seuls les numéros vérifiés dans la console Twilio peuvent recevoir des SMS

## Fichiers modifiés/créés
- `supabase/functions/send-sms-otp/index.ts` (nouveau)
- `supabase/functions/verify-sms-otp/index.ts` (nouveau)
- `src/pages/AuthPage.tsx` (mode téléphone)
- `src/pages/MfaPage.tsx` (option SMS)
- `src/i18n/fr.ts` et `src/i18n/en.ts` (traductions)
- Migration SQL pour la table `sms_otp_codes`

