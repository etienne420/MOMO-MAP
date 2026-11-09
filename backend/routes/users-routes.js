import express from "express";
import usersController from "../controllers/users-controller.js";
import checkAuth from "../middleware/check-auth.js";

const router = express.Router();

// ==========================================
// CONSULTER LES UTILISATEURS
// ==========================================

router.get("/", usersController.getUsers);

router.get("/:uid", usersController.getUserById);

// Catalogue de la boutique (public)
router.get("/shop/catalog", usersController.getShopCatalog);

// ==========================================
// AUTHENTIFICATION
// ==========================================

// Connexion
router.post("/login", usersController.login);

// Inscription
router.post("/register", usersController.register);

// ==========================================
// AUTHENTIFICATION REQUISE
// ==========================================

router.use(checkAuth);

// Modifier le thème actuel d'un utilisateur
router.patch("/:uid/theme", usersController.updateTheme);

// Modifier l'avatar actuel d'un utilisateur
router.patch("/:uid/avatar", usersController.updateAvatar);

// Boutique
router.post("/:uid/shop/purchase", usersController.purchaseItem);
router.patch("/:uid/shop/equip", usersController.equipItem);

// Préférences
router.patch("/:uid/settings", usersController.updateSettings);

export default router;
