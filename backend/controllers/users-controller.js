import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/users.js";
import Theme from "../models/theme.js";
import Avatar from "../models/avatar.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSTITUTIONAL_DOMAIN = "cmontmorency.qc.ca";
const BCRYPT_ROUNDS = 12;

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Vérifier le courriel institutionnel
function isInstitutionalEmail(email) {
  if (!EMAIL_PATTERN.test(email)) return false;

  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();

  return (
    domain === INSTITUTIONAL_DOMAIN ||
    domain.endsWith(`.${INSTITUTIONAL_DOMAIN}`)
  );
}

// Échapper les caractères spéciaux pour RegExp
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Vérifier la clé secrète JWT
function assertJwtSecret(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    const error = new Error(
      "JWT_SECRET doit être configuré avec au moins 32 caractères.",
    );

    error.code = 500;
    throw error;
  }     
}


// Créer un token JWT
function createAccessToken(user, secret) {
  assertJwtSecret(secret);

  return jwt.sign(
    {
      role: user.role === "admin" ? "admin" : "user",
      username: user.username,
    },
    secret,
    {
      algorithm: "HS256",
      expiresIn: "1h",
      subject: user._id.toString(),
    },
  );
}

// Retourner les informations publiques de l'utilisateur
function getPublicUser(user) {
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    tokens: user.tokens,
    themeActuel: user.themeActuel,
    avatarActuel: user.avatarActuel,
    ownedThemes: user.ownedThemes,
    ownedAvatars: user.ownedAvatars,
    settings: user.settings,
  };
}

// ==========================================
// OBTENIR TOUS LES UTILISATEURS
// ==========================================

async function getUsers(req, res, next) {
  try {
    const users = await User.find({}).select("-password");

    res.json(users);
  } catch (error) {
    next(error);
  }
}

// ==========================================
// OBTENIR UN UTILISATEUR PAR ID
// ==========================================

async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.uid)
      .select("-password")
      .populate("themeActuel")
      .populate("avatarActuel");

    if (!user) {
      return res.status(404).json({
        message: "Utilisateur introuvable.",
      });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
}

// ==========================================
// INSCRIPTION
// ==========================================

async function register(req, res, next) {
  if (!isObject(req.body)) {
    return res.status(400).json({
      message: "Les informations du compte sont invalides.",
    });
  }

  const { username, email, password } = req.body;

  if (
    typeof username !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      message: "Nom d'utilisateur, courriel et mot de passe requis.",
    });
  }

  const cleanUsername = username.trim();
  const normalizedUsername = cleanUsername.toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  if (cleanUsername.length < 3) {
    return res.status(400).json({
      message: "Le nom d'utilisateur doit contenir au moins 3 caractères.",
    });
  }

  if (!isInstitutionalEmail(normalizedEmail)) {
    return res.status(400).json({
      message: "Veuillez utiliser une adresse courriel du Cégep Montmorency.",
    });
  }

  if (password.length < 3) {
    return res.status(400).json({
      message: "Le mot de passe doit contenir au moins 3 caractères.",
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    assertJwtSecret(jwtSecret);

    // Recherche exacte du username et du courriel
    const usernamePattern = new RegExp(
      `^${escapeRegExp(normalizedUsername)}$`,
      "i",
    );

    const emailPattern = new RegExp(`^${escapeRegExp(normalizedEmail)}$`, "i");

    const existingUser = await User.findOne({
      $or: [{ username: usernamePattern }, { email: emailPattern }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Ce nom d'utilisateur ou courriel est déjà utilisé.",
      });
    }

    // Hacher le mot de passe avec bcrypt
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Créer l'utilisateur avec 1 token initial
    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
      tokens: 1,
    });

    return res.status(201).json({
      token: createAccessToken(user, jwtSecret),
      user: getPublicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Ce nom d'utilisateur ou courriel est déjà utilisé.",
      });
    }

    next(error);
  }
}

// ==========================================
// CONNEXION
// ==========================================

async function login(req, res, next) {
  if (!isObject(req.body)) {
    return res.status(400).json({
      message: "Les identifiants sont invalides.",
    });
  }

  const { username, password } = req.body;

  if (
    typeof username !== "string" ||
    !username.trim() ||
    typeof password !== "string" ||
    password.length < 3
  ) {
    return res.status(400).json({
      message: "Nom d'utilisateur et mot de passe requis.",
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    assertJwtSecret(jwtSecret);

    const normalizedIdentifier = username.trim().toLowerCase();

    // Recherche exacte du username ou du courriel
    const identifierPattern = new RegExp(
      `^${escapeRegExp(normalizedIdentifier)}$`,
      "i",
    );

    const user = await User.findOne({
      $or: [{ username: identifierPattern }, { email: identifierPattern }],
    });

    // Vérifier les identifiants
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Identifiants invalides.",
      });
    }

    // Ajouter 1 token après chaque connexion réussie
    user.tokens += 1;

    await user.save();

    return res.json({
      token: createAccessToken(user, jwtSecret),
      user: getPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// MODIFIER LE THÈME
// ==========================================

async function updateTheme(req, res, next) {
  try {
    const user = await User.findById(req.params.uid);

    if (!user) {
      return res.status(404).json({
        message: "Utilisateur introuvable.",
      });
    }

    user.themeActuel = req.body.themeActuel || null;

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select("-password")
      .populate("themeActuel")
      .populate("avatarActuel");

    res.json({
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// MODIFIER L'AVATAR
// ==========================================

async function updateAvatar(req, res, next) {
  try {
    const user = await User.findById(req.params.uid);

    if (!user) {
      return res.status(404).json({
        message: "Utilisateur introuvable.",
      });
    }

    user.avatarActuel = req.body.avatarActuel || null;

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select("-password")
      .populate("themeActuel")
      .populate("avatarActuel");

    res.json({
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// CATALOGUE DE LA BOUTIQUE
// ==========================================

async function getShopCatalog(req, res, next) {
  try {
    const [themes, avatars] = await Promise.all([
      Theme.find({}).lean(),
      Avatar.find({}).lean(),
    ]);
    res.json({ themes, avatars });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// ACHETER UN ARTICLE
// ==========================================

async function purchaseItem(req, res, next) {
  try {
    const { kind, itemId } = req.body || {};
    if (kind !== "theme" && kind !== "avatar") {
      return res.status(400).json({ message: "Type d'article invalide." });
    }
    if (typeof itemId !== "string" || !itemId) {
      return res.status(400).json({ message: "Identifiant d'article requis." });
    }

    const Model = kind === "theme" ? Theme : Avatar;
    const item = await Model.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Article introuvable." });
    }

    const user = await User.findById(req.params.uid);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const ownedField = kind === "theme" ? "ownedThemes" : "ownedAvatars";
    const alreadyOwned = user[ownedField].some(
      (id) => id.toString() === itemId,
    );
    if (alreadyOwned) {
      return res.status(409).json({ message: "Article déjà possédé." });
    }

    if (user.tokens < item.prix) {
      return res.status(400).json({ message: "Jetons insuffisants." });
    }

    user.tokens -= item.prix;
    user[ownedField].push(item._id);
    await user.save();

    res.json({ user: getPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// ÉQUIPER UN THÈME OU UN AVATAR
// ==========================================

async function equipItem(req, res, next) {
  try {
    const { kind, itemId } = req.body || {};
    if (kind !== "theme" && kind !== "avatar") {
      return res.status(400).json({ message: "Type d'article invalide." });
    }

    const user = await User.findById(req.params.uid);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const ownedField = kind === "theme" ? "ownedThemes" : "ownedAvatars";
    const equipField = kind === "theme" ? "themeActuel" : "avatarActuel";

    if (itemId === null) {
      user[equipField] = null;
    } else {
      const owned = user[ownedField].some(
        (id) => id.toString() === itemId,
      );
      if (!owned) {
        return res.status(403).json({ message: "Article non possédé." });
      }
      user[equipField] = itemId;
    }

    await user.save();
    res.json({ user: getPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// METTRE À JOUR LES PRÉFÉRENCES
// ==========================================

async function updateSettings(req, res, next) {
  try {
    const user = await User.findById(req.params.uid);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const incoming = req.body?.settings;
    if (!isObject(incoming)) {
      return res.status(400).json({ message: "Préférences invalides." });
    }

    const allowed = ["turnByTurnGuidance", "showSchoolInsights", "reducedMotion"];
    for (const key of allowed) {
      if (typeof incoming[key] === "boolean") {
        user.settings[key] = incoming[key];
      }
    }

    await user.save();
    res.json({ user: getPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// EXPORTATION
// ==========================================

const usersController = {
  getUsers,
  getUserById,
  register,
  login,
  updateTheme,
  updateAvatar,
  getShopCatalog,
  purchaseItem,
  equipItem,
  updateSettings,
};

export default usersController;
