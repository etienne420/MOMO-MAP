# MOMO-MAP

Système de cartographie interactive et de navigation intérieure pour le Collège Montmorency.
Équipe : Tigran Michael Matinyan - Étienne Desaulnier - Alexander Saint-Jean - Redford S. St-Martin
---

## Description

MOMO-MAP est une application web conçue pour faciliter l'orientation des étudiants, du personnel et des visiteurs sur le campus du Collège Montmorency. Le système permet de visualiser les plans d'étage, de rechercher des locaux, d'identifier des commodités et de calculer des itinéraires optimaux.

---

## Fonctionnalités

- **Navigation 2D** : Déplacement interactif (panoramique, zoom à la molette et au toucher, recentrage).
- **Recherche de locaux** : Recherche par identifiant de local avec mise en évidence visuelle.
- **Calcul d'itinéraires** : Sélection d'un point de départ et d'une destination avec inversion rapide.
- **Points d'intérêt et commodités** : Filtres rapides pour localiser toilettes, ascenseurs, services étudiants et informatiques.
- **Authentification** : Gestion des comptes étudiants et employés via adresse institutionnelle (`@cmontmorency.qc.ca`).
- **Interface adaptative** : Prise en charge des écrans mobiles, tablettes et ordinateurs de bureau.

---

## Structure du projet

```text
MOMO-MAP/
├── backend/                   # API REST Express & base de données
│   ├── handler/               # Gestionnaires d'erreurs
│   ├── models/                # Modèles Mongoose (users, local, poi, etc.)
│   ├── utils/                 # Connexion à la base de données
│   ├── app.js                 # Point d'entrée de l'API
│   └── package.json
│
├── frontend/                  # Application React & Vite
│   ├── src/
│   │   ├── components/        # Composants d'interface (carte, formulaires, etc.)
│   │   ├── pages/             # Pages (LoginPage, SignUpPage, MapPage)
│   │   ├── styles/            # Feuilles de style globales
│   │   ├── utils/             # Utilitaires de validation
│   │   ├── App.jsx            # Configuration du routeur
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── docs/                      # Spécifications et exigences du projet
└── README.md
```

---

## Technologies

### Frontend
- React 19
- React Router 7
- Vite 8
- Oxlint

### Backend
- Node.js
- Express 5
- MongoDB & Mongoose 9
- JSON Web Tokens (JWT)
- Helmet & Express Rate Limit

---

## Prérequis

- Node.js (version 20 ou supérieure)
- MongoDB (local ou distant)
- npm

---

## Installation

### 1. Cloner le dépôt
```bash
git clone https://github.com/etienne420/MOMO-MAP.git
cd MOMO-MAP
```

### 2. Configurer le Backend
```bash
cd backend
npm install
```

Créer un fichier `.env` dans le dossier `backend/` :
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/momo-map
JWT_SECRET=cle_secrete_jwt
```

### 3. Configurer le Frontend
Dans un terminal distinct :
```bash
cd frontend
npm install
```

---

## Démarrage

### Backend
```bash
cd backend
npm run dev
```
Accessible par défaut sur `http://localhost:5000`.

### Frontend
```bash
cd frontend
npm run dev
```
Accessible par défaut sur `http://localhost:5173`.

---

## Scripts

### Frontend
- `npm run dev` : Lance le serveur de développement Vite.
- `npm run build` : Génère le build de production dans `dist/`.
- `npm run lint` : Analyse le code source avec Oxlint.
- `npm run preview` : Prévisualise le build de production.

### Backend
- `npm run dev` : Lance l'API avec rechargement automatique (Nodemon).
- `npm start` : Démarre l'API en mode production.
- `npm test` : Exécute la suite de tests unitaires.
