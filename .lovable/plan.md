

## Problème

Le nom affiché dans l'app Authenticator (Google Authenticator, Authy, etc.) est figé au moment où le QR code est scanné. Même si le code a été mis à jour avec `issuer: "Portail Cloudmature"`, les utilisateurs qui ont scanné le QR **avant** cette modification voient toujours l'ancien nom `azure-portal-gen.lovable.app`.

## Solution

Il faut réinitialiser le MFA pour chaque utilisateur concerné, puis les faire se réenregistrer. Le nouveau QR code affichera bien "Portail Cloudmature".

### Étapes

1. **Depuis le panneau Admin** : utiliser la fonction existante "Désactiver MFA" pour supprimer le facteur TOTP de l'utilisateur (via l'edge function `manage-user-mfa` avec l'action `unenroll`).

2. **L'utilisateur se reconnecte** : à la prochaine connexion, la page MFA détectera qu'il n'a plus de facteur vérifié et lancera automatiquement un nouvel enregistrement avec `issuer: "Portail Cloudmature"`.

3. **L'utilisateur scanne le nouveau QR code** : cette fois, l'app Authenticator affichera bien **"Portail Cloudmature"** comme nom.

### Détail technique

Aucune modification de code n'est nécessaire — le `issuer` est déjà configuré correctement. C'est uniquement une action administrative de réinitialisation du MFA pour les utilisateurs existants.

