// Middleware pour vérifier l'authentification
import jwt from "jsonwebtoken";
import HttpError from "../utils/http-error.js";

const checkAuth = (req, res, next) => {
  try {
    if (req.method === "OPTIONS") {
      return next();
    }

    // Récupération du token depuis l'en-tête Authorization
    const token = req.headers.authorization.split(" ")[1]; // Authorization: 'Bearer TOKEN'
    if (!token) {
      throw new Error(
        "Vous devez être connecté pour accéder à cette ressource!",
      );
    }

    // Vérification du token JWT
    const decodedToken = jwt.verify(token, "cleSuperSecrete!");
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (err) {
    const error = new HttpError("Authentification échouée!", 401);
    return next(error);
  }
};

export default checkAuth;
