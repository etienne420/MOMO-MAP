# MOMO-MAP

## Authentification

Le client React prend en charge les formulaires d’inscription et de connexion, mais
ne crée et ne signe aucun JWT. Un serveur d’authentification est requis pour vérifier
les identifiants, enregistrer les comptes et signer les jetons.

1. Copiez `.env.example` vers `.env`.
2. Définissez `VITE_API_BASE_URL` à l’adresse de votre API.
3. Le serveur doit fournir `POST /auth/register` et `POST /auth/login`. Le client
   envoie les champs `username`, `email` et `password` à l’inscription, puis
   `username` et `password` à la connexion.
4. Chaque route doit retourner un objet JSON contenant `token` ou `accessToken`
   (un JWT signé avec une date d’expiration `exp` et une revendication `role`
   valant `user` ou `admin`). Les erreurs peuvent être retournées dans un champ
   `message` ou `error`.

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

Le hachage des mots de passe doit être fait exclusivement par le serveur avant leur
enregistrement, avec un algorithme dédié aux mots de passe tel qu’Argon2id et un sel
unique géré par la bibliothèque. À la connexion, le serveur vérifie le mot de passe
avec cette même bibliothèque. Ne stockez jamais les mots de passe en clair et ne les
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
