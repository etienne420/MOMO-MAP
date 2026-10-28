// utils/bd.js
import mongoose from "mongoose";

let isConnected = false;

// Si déjà connecté, on ne reconnecte pas
export const connectDB = async (MONGODB_URI) => {
  if (isConnected) return;

  try {
    // Tentative de connexion à la base de données
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log("Connexion MongoDB réussie");
  } catch (err) {
    console.error("Erreur de connexion MongoDB :", err.message);
    process.exit(1); // Arrête le serveur en cas d'échec
  }
};
