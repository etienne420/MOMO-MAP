import express from "express";
import usersController from "../controllers/users-controller.js";
import checkAuth from "../middleware/check-auth.js";
import { authorizeRoles, validateObjectIdParam } from "../middleware/auth.js";

const router = express.Router();

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

// Catalogue de la boutique (authentification requise)
router.get("/shop/catalog", usersController.getShopCatalog);

// Lister tous les utilisateurs (réservé aux administrateurs)
router.get("/", authorizeRoles("admin"), usersController.getUsers);

// Valide que :uid est un ObjectId MongoDB valide (400 sinon)
const validateUid = validateObjectIdParam("uid");

router.get("/:uid", validateUid, usersController.getUserById);

// Modifier le thème actuel d'un utilisateur
router.patch("/:uid/theme", validateUid, usersController.updateTheme);

// Modifier l'avatar actuel d'un utilisateur
router.patch("/:uid/avatar", validateUid, usersController.updateAvatar);

// Boutique
router.post("/:uid/shop/purchase", validateUid, usersController.purchaseItem);
router.patch("/:uid/shop/equip", validateUid, usersController.equipItem);

// Préférences
router.patch("/:uid/settings", validateUid, usersController.updateSettings);

// Bonus quotidien (1 jeton par jour)
router.post("/:uid/daily-bonus", validateUid, usersController.claimDailyBonus);

export default router;
