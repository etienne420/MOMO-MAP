# MOMO-MAP

## Authentification

Le formulaire React utilise l’API d’authentification du backend.

1. Dans `backend/.env`, configurez `MONGODB_URI`, `JWT_SECRET` (au moins 32
   caractères) et, si nécessaire, `PORT` (5000 par défaut).
2. Dans `frontend/.env`, définissez `VITE_API_BASE_URL` à l’adresse du backend.
   L’exemple fourni pointe déjà sur `http://localhost:5000`.
3. Lancez le backend depuis `backend` avec `npm run dev`, puis le frontend depuis
   `frontend` avec `npm run dev`.

Le backend fournit `POST /auth/register` (champs `username`, `email`, `password`)
et `POST /auth/login` (champs `username` ou courriel, et `password`). Les deux
routes renvoient `{ "token": "..." }`, un JWT signé qui expire après une heure et
contient le rôle enregistré pour le compte. Tout nouveau compte reçoit le rôle
`user`; un champ `role` envoyé à l’inscription est ignoré. Pour promouvoir un
compte, modifiez manuellement son champ `role` dans MongoDB à `admin`.

Les routes protégées doivent utiliser `authenticateToken` puis `authorizeRoles`
depuis `backend/middleware/auth.js`, par exemple
`authenticateToken(), authorizeRoles("admin")` pour une route réservée aux
administrateurs. Le serveur vérifie la signature, l’expiration et le rôle du JWT;
le rôle affiché par le frontend ne constitue jamais une autorisation.

Le jeton reçu est conservé dans `sessionStorage` pour l’onglet courant et supprimé
à la déconnexion. L’inscription vérifie aussi le format du courriel institutionnel
côté client, mais le serveur doit refaire cette validation et toutes les validations
de sécurité : une vérification côté navigateur peut être contournée. N’envoyez jamais
de mot de passe vers un service tiers et ne signez jamais de JWT dans le client.
Le client lit uniquement la date d’expiration du JWT pour fermer une session
expirée ; il ne valide pas sa signature, ce qui doit rester la responsabilité du serveur.
Le rôle décodé du JWT sert uniquement à afficher le rôle de la session dans
l’interface. Le serveur doit attribuer le rôle lors de la création du compte,
vérifier le jeton et autoriser chaque opération protégée. Ne faites jamais confiance
au rôle lu côté client pour protéger une route ou une donnée.

Le backend hache les mots de passe avec scrypt et un sel aléatoire avant leur
enregistrement. À la connexion, il vérifie le mot de passe avec le même algorithme.
Ne stockez jamais les mots de passe en clair et ne les
pré-hachez pas dans le client : un hachage client réutilisable pourrait servir de
mot de passe de remplacement. L’API doit être servie en HTTPS en production.

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
