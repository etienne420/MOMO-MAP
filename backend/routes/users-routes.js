import express from "express";
import usersController from "../controllers/users-controller.js";
import checkAuth from "../middleware/check-auth.js";
import { authorizeRoles, validateObjectIdParam } from "../middleware/auth.js";

const router = express.Router();

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

// Valide que :uid est un ObjectId MongoDB valide (400 sinon)
router.use("/:uid", validateObjectIdParam("uid"));

// Lister tous les utilisateurs (réservé aux administrateurs)
router.get("/", authorizeRoles("admin"), usersController.getUsers);

router.get("/:uid", usersController.getUserById);

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
