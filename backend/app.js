// app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Importer le gestionnaire d'erreurs
import errorHandler from "./handler/error-handler.js";
import { connectDB } from "./utils/db.js";

const PORT = process.env.PORT || 5000;

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://All-user:Momo-Map2026@momo-map.2oegp3l.mongodb.net/momo_map_db?retryWrites=true&w=majority";

// Connexion à MongoDB
await connectDB(MONGODB_URI);

const app = express();

// 1. Sécurité Helmet : Sécurise les en-têtes HTTP
app.use(helmet());

// 2. Limitation de débit (Rate Limiting) : Empêche les abus / attaques par force brute
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite chaque IP à 100 requêtes par fenêtre de 15 minutes
  standardHeaders: true, // Renvoie les infos de limite dans les en-têtes RateLimit-*
  legacyHeaders: false, // Désactive les en-têtes X-RateLimit-*
  message: {
    error:
      "Trop de requêtes provenant de cette IP, veuillez réessayer plus tard.",
  },
});
app.use(limiter);

app.use(express.json());

// 3. Configuration CORS sécurisée
const corsOptions = {
  origin: "*", // Vous pouvez remplacer "*" par une URL spécifique (ex: "http://localhost:3000") en production
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
};
app.use(cors(corsOptions));

// Si aucune route n'est trouvée, on crée une erreur
app.use((req, res, next) => {
  const error = new Error("Route non trouvée");
  error.code = 404;
  next(error);
});

// Intercepte toutes les erreurs envoyées avec next(error)
app.use(errorHandler);

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

export default app;
