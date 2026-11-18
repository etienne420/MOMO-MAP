import { body, param, validationResult } from "express-validator";
import mongoose from "mongoose";

/**
 * Middleware qui intercepte les erreurs générées par express-validator
 * et renvoie un statut HTTP 400 avec le message de la première erreur
 * ainsi que le détail complet dans le champ `errors`.
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array();
    return res.status(400).json({
      message: errorList[0].msg,
      errors: errorList,
    });
  }
  next();
}

/**
 * Vérifie si une adresse courriel appartient au domaine institutionnel du Cégep Montmorency.
 */
export function isInstitutionalEmail(email) {
  if (typeof email !== "string") return false;
  const cleanEmail = email.trim().toLowerCase();
  const atIndex = cleanEmail.lastIndexOf("@");
  if (atIndex === -1) return false;

  const domain = cleanEmail.slice(atIndex + 1);
  return domain === "cmontmorency.qc.ca" || domain.endsWith(".cmontmorency.qc.ca");
}

// ============================================================================
// VALIDATEURS POUR L'AUTHENTIFICATION & COMPTES
// ============================================================================

export const validateRegister = [
  body("username")
    .exists({ checkFalsy: true })
    .withMessage("Nom d'utilisateur requis.")
    .bail()
    .isString()
    .withMessage("Le nom d'utilisateur doit être une chaîne de caractères.")
    .bail()
    .trim()
    .isLength({ min: 3 })
    .withMessage("Le nom d'utilisateur doit contenir au moins 3 caractères."),

  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Courriel requis.")
    .bail()
    .isString()
    .withMessage("Le courriel doit être une chaîne de caractères.")
    .bail()
    .trim()
    .isEmail()
    .withMessage("Veuillez entrer une adresse courriel valide.")
    .bail()
    .custom((value) => {
      if (!isInstitutionalEmail(value)) {
        throw new Error("Veuillez utiliser une adresse courriel du Cégep Montmorency.");
      }
      return true;
    }),

  body("password")
    .exists({ checkFalsy: true })
    .withMessage("Mot de passe requis.")
    .bail()
    .isString()
    .withMessage("Le mot de passe doit être une chaîne de caractères.")
    .bail()
    .isLength({ min: 3 })
    .withMessage("Le mot de passe doit contenir au moins 3 caractères."),

  handleValidationErrors,
];

export const validateLogin = [
  body("username")
    .exists({ checkFalsy: true })
    .withMessage("Nom d'utilisateur ou courriel requis.")
    .bail()
    .isString()
    .withMessage("Le nom d'utilisateur doit être une chaîne de caractères.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Nom d'utilisateur ou courriel requis."),

  body("password")
    .exists({ checkFalsy: true })
    .withMessage("Mot de passe requis.")
    .bail()
    .isString()
    .withMessage("Le mot de passe doit être une chaîne de caractères.")
    .bail()
    .isLength({ min: 3 })
    .withMessage("Le mot de passe doit contenir au moins 3 caractères."),

  handleValidationErrors,
];

// ============================================================================
// VALIDATEURS POUR LES UTILISATEURS & RESSOURCES
// ============================================================================

export const validateUidParam = [
  param("uid")
    .isMongoId()
    .withMessage("Identifiant invalide."),
  handleValidationErrors,
];

export const validateThemeUpdate = [
  param("uid")
    .isMongoId()
    .withMessage("Identifiant invalide."),
  body("themeActuel")
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null) return true;
      if (!mongoose.isValidObjectId(value)) {
        throw new Error("Identifiant de thème invalide.");
      }
      return true;
    }),
  handleValidationErrors,
];

export const validateAvatarUpdate = [
  param("uid")
    .isMongoId()
    .withMessage("Identifiant invalide."),
  body("avatarActuel")
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null) return true;
      if (!mongoose.isValidObjectId(value)) {
        throw new Error("Identifiant d'avatar invalide.");
      }
      return true;
    }),
  handleValidationErrors,
];

export const validatePurchaseItem = [
  param("uid")
    .isMongoId()
    .withMessage("Identifiant invalide."),
  body("kind")
    .isIn(["theme", "avatar"])
    .withMessage("Type d'article invalide."),
  body("itemId")
    .exists({ checkFalsy: true })
    .withMessage("Identifiant d'article requis.")
    .bail()
    .isMongoId()
    .withMessage("Identifiant d'article invalide."),
  handleValidationErrors,
];

export const validateEquipItem = [
  param("uid")
    .isMongoId()
    .withMessage("Identifiant invalide."),
  body("kind")
    .isIn(["theme", "avatar"])
    .withMessage("Type d'article invalide."),
  body("itemId")
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null) return true;
      if (!mongoose.isValidObjectId(value)) {
        throw new Error("Identifiant d'article invalide.");
      }
      return true;
    }),
  handleValidationErrors,
];

export const validateSettingsUpdate = [
  param("uid")
    .isMongoId()
    .withMessage("Identifiant invalide."),
  body("settings")
    .isObject()
    .withMessage("Préférences invalides."),
  body("settings.turnByTurnGuidance")
    .optional()
    .isBoolean()
    .withMessage("turnByTurnGuidance doit être un booléen."),
  body("settings.showSchoolInsights")
    .optional()
    .isBoolean()
    .withMessage("showSchoolInsights doit être un booléen."),
  body("settings.reducedMotion")
    .optional()
    .isBoolean()
    .withMessage("reducedMotion doit être un booléen."),
  handleValidationErrors,
];

