import express from "express";
import usersController from "../controllers/users-controller.js";
import checkAuth from "../middleware/check-auth.js";
import { authorizeRoles } from "../middleware/auth.js";
import {
  validateRegister,
  validateLogin,
  validateUidParam,
  validateThemeUpdate,
  validateAvatarUpdate,
  validatePurchaseItem,
  validateEquipItem,
  validateSettingsUpdate,
} from "../middleware/validators.js";

const router = express.Router();

// ==========================================
// AUTHENTIFICATION
// ==========================================

// Connexion
router.post("/login", validateLogin, usersController.login);

// Inscription
router.post("/register", validateRegister, usersController.register);

// ==========================================
// AUTHENTIFICATION REQUISE
// ==========================================

router.use(checkAuth);

// Catalogue de la boutique (authentification requise)
router.get("/shop/catalog", usersController.getShopCatalog);

// Lister tous les utilisateurs (réservé aux administrateurs)
router.get("/", authorizeRoles("admin"), usersController.getUsers);

// Obtenir le profil d'un utilisateur
router.get("/:uid", validateUidParam, usersController.getUserById);

// Modifier le thème actuel d'un utilisateur
router.patch("/:uid/theme", validateThemeUpdate, usersController.updateTheme);

// Modifier l'avatar actuel d'un utilisateur
router.patch("/:uid/avatar", validateAvatarUpdate, usersController.updateAvatar);

// Boutique
router.post("/:uid/shop/purchase", validatePurchaseItem, usersController.purchaseItem);
router.patch("/:uid/shop/equip", validateEquipItem, usersController.equipItem);

// Préférences
router.patch("/:uid/settings", validateSettingsUpdate, usersController.updateSettings);

// Bonus quotidien (1 jeton par jour)
router.post("/:uid/daily-bonus", validateUidParam, usersController.claimDailyBonus);

export default router;
