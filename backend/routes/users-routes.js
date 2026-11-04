// users-routes.js
import express from "express";
import { check } from "express-validator";
import usersController from "../controllers/users-controller.js";
import checkAuth from "../middleware/check-auth.js";

const router = express.Router();

// Middleware pour obtenir toutes les utilisateurs
router.get("/", usersController.getUsers);

// Middleware pour obtenir un utilisateur par son ID
router.get("/:uid", usersController.getUserById);


//  Middleware pour la connexion d'un utilisateur
router.post("/login", usersController.login);

//  Middleware pour l'inscription d'un utilisateur
router.post(
  "/register",
  [
    check("username").not().isEmpty(), // username ne doit pas être vide
    check("email").isEmail(), // email doit être valide
    check("password").isLength({ min: 3 }), // password doit contenir au moins 3 caractères
  ],
  usersController.register,
);

// Middleware pour authentifier l'utilisateur
router.use(checkAuth);

// Middleware pour ajouter un film à un utilisateur
router.post("/add/:uid/:mid", usersController.addMovieToUser);

// Middleware pour supprimer un film d'un utilisateur
router.delete("/delete/:uid/:mid", usersController.deleteMovieFromUser);

export default router;
