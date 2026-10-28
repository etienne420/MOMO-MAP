// app.js
import express from "express";
import cors from "cors";

// Importer le gestionnaire d'erreurs
import errorHandler from "./handler/error-handler.js";
import { connectDB } from "./utils/db.js";

const PORT = process.env.PORT || 5000;

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://yaeguchii34_db_user:Momo-Map2026@momo-map.2oegp3l.mongodb.net/";

// Connextion à MongoDB
await connectDB(MONGODB_URI);

const app = express();

app.use(express.json());

app.use(cors());

// ce middleware ne retourne pas de reponse mais va ajoute run header
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // header et value * quels domaines peuvent acceder a notre serveur
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  ); //quel header sont autorisés ( pourait etre * pour tout)
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE"); // quelles methodes HTTP sont autorisées
  next();
});

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
