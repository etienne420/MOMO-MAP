import express from "express";
import { check } from "express-validator";
import usersController from "../controllers/users-controller.js";
import checkAuth from "../middleware/check-auth.js";

const router = express.Router();

// Obtenir tous les utilisateurs
router.get("/", usersController.getUsers);

// Obtenir un utilisateur par son ID
router.get("/:uid", usersController.getUserById);

// Connexion d'un utilisateur
router.post(
  "/login",
  [check("email").isEmail(), check("password").not().isEmpty()],
  usersController.login,
);

// Inscription d'un utilisateur
router.post(
  "/register",
  [
    check("name").not().isEmpty(),
    check("email").isEmail(),
    check("password").isLength({ min: 3 }),
  ],
  usersController.register,
);

// Authentification requise pour les routes suivantes
router.use(checkAuth);

// Ajouter des tokens à un utilisateur
router.patch("/:uid/tokens", usersController.updateTokens);

// Modifier le thème actuel d'un utilisateur
router.patch("/:uid/theme", usersController.updateTheme);

// Modifier l'avatar actuel d'un utilisateur
router.patch("/:uid/avatar", usersController.updateAvatar);

export default router;
