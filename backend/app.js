import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import errorHandler from "./handler/error-handler.js";
import { connectDB } from "./utils/db.js";
import usersRoutes from "./routes/users-routes.js";
import avatarsRoutes from "./routes/avatars-routes.js";

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("ERREUR : MONGODB_URI n'est pas défini dans le fichier .env !");
  process.exit(1);
}

await connectDB(MONGODB_URI);

const app = express();

// 1. Sécurité Helmet
app.use(helmet());

// 2. Limitation de débit (Rate Limiting)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Trop de requêtes provenant de cette IP, veuillez réessayer plus tard.",
  },
});
app.use(limiter);

// 3. Parsing JSON (multer gère le multipart/form-data sur /api/avatars)
app.use(express.json());

// 4. Configuration CORS
const corsOptions = {
  origin: process.env.CLIENT_URL || "*",
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

// 5. Route principale
app.get("/", (req, res) => {
  res.status(200).json({
    message: "API REST MoMo-MAP opérationnelle !",
    status: "success",
  });
});

// 6. Routes API
app.use("/api/users", usersRoutes);
app.use("/api/avatars", avatarsRoutes);

// 7. Route 404
app.use((req, res, next) => {
  const error = new Error("Route non trouvée");
  error.code = 404;
  next(error);
});

// 8. Gestionnaire global d'erreurs
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

export default app;
