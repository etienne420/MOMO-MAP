import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/users.js";
import HttpError from "../util/http-error.js";

// GET - Obtenir tous les utilisateurs
const getUsers = async (req, res, next) => {
  let users;

  try {
    users = await User.find({})
      .populate("themeActuel")
      .populate("avatarActuel");
  } catch (e) {
    console.error(e);
    return next(new HttpError("Une erreur BD est survenue.", 500));
  }

  res.status(200).json({
    users: users.map((user) => user.toObject({ getters: true })),
  });
};

// GET - Obtenir un utilisateur par son ID
const getUserById = async (req, res, next) => {
  const userId = req.params.uid;
  let user;

  try {
    user = await User.findById(userId)
      .populate("themeActuel")
      .populate("avatarActuel");
  } catch (e) {
    console.error(e);
    return next(
      new HttpError("Erreur lors de la récupération de l'utilisateur.", 500),
    );
  }

  if (!user) {
    return res.status(404).json({
      message: "Utilisateur non trouvé.",
    });
  }

  res.status(200).json({
    user: user.toObject({ getters: true }),
  });
};


// POST - Inscription utilisateur
const register = async (req, res, next) => {
  const { name, email, password } = req.body;

  let hasUser;

  // Vérifier si l'email existe déjà
  try {
    hasUser = await User.findOne({ email });
  } catch (e) {
    console.error(e);
    return next(new HttpError("Erreur lors de la vérification de l'utilisateur.", 500));
  }

  if (hasUser) {
    return res.status(422).json({
      message: "Cet email est déjà utilisé.",
    });
  }

  // Hacher le mot de passe
  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (e) {
    console.error(e);
    return next(new HttpError("Erreur lors du hachage du mot de passe.", 500));
  }

  // Créer le nouvel utilisateur
  const createdUser = new User({
    name,
    email,
    password: hashedPassword,
    tokens: 0,
    themeActuel: null,
    avatarActuel: null,
  });

  try {
    await createdUser.save();
  } catch (e) {
    console.error(e);
    return next(new HttpError("Création de l'utilisateur échouée.", 500));
  }

  res.status(201).json({
    user: {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      tokens: createdUser.tokens,
    },
    message: "Inscription réussie.",
  });
};



// POST - Connexion utilisateur
const login = async (req, res, next) => {
  // Récupération des informations de connexion
  const { email, password } = req.body;

  let identifiedUser;

  // Recherche de l'utilisateur avec son email
  try {
    identifiedUser = await User.findOne({ email })
      .populate("themeActuel")
      .populate("avatarActuel");
  } catch (e) {
    console.error(e);
    return next(
      new HttpError("Erreur lors de la récupération de l'utilisateur.", 500)
    );
  }

  // Vérifier si l'utilisateur existe
  if (!identifiedUser) {
    return res.status(401).json({
      message: "Identification échouée, vérifiez vos identifiants.",
    });
  }

  // Comparer le mot de passe fourni avec le hash dans MongoDB
  let isValidPassword;

  try {
    isValidPassword = await bcrypt.compare(
      password,
      identifiedUser.password
    );
  } catch (e) {
    console.error(e);
    return next(
      new HttpError("Erreur lors de la vérification du mot de passe.", 500)
    );
  }

  // Vérifier si le mot de passe est correct
  if (!isValidPassword) {
    return res.status(401).json({
      message: "Identification échouée, vérifiez vos identifiants.",
    });
  }

  // Création du token JWT
  let token;

  try {
    token = jwt.sign(
      {
        userId: identifiedUser.id,
        email: identifiedUser.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
  } catch (e) {
    console.error(e);
    return next(
      new HttpError("Impossible de créer le token JWT.", 500)
    );
  }

  // Retourner les informations de l'utilisateur
  res.status(200).json({
    userId: identifiedUser.id,
    name: identifiedUser.name,
    email: identifiedUser.email,
    tokens: identifiedUser.tokens,
    themeActuel: identifiedUser.themeActuel,
    avatarActuel: identifiedUser.avatarActuel,
    token: token,
  });
};


// PATCH - Modifier les tokens d'un utilisateur
const updateTokens = async (req, res, next) => {
  const userId = req.params.uid;
  const { tokens } = req.body;

  if (!Number.isInteger(tokens) || tokens < 0) {
    return res.status(400).json({
      message: "Le nombre de tokens doit être un entier positif ou nul.",
    });
  }

  let user;

  try {
    user = await User.findById(userId);
  } catch (e) {
    console.error(e);
    return next(
      new HttpError("Erreur lors de la récupération de l'utilisateur.", 500),
    );
  }

  if (!user) {
    return res.status(404).json({
      message: "Utilisateur non trouvé.",
    });
  }

  try {
    user.tokens = tokens;
    await user.save();

    res.status(200).json({
      message: "Tokens mis à jour avec succès.",
      tokens: user.tokens,
    });
  } catch (e) {
    console.error(e);
    return next(new HttpError("Impossible de modifier les tokens.", 500));
  }
};

// PATCH - Modifier le thème actuel d'un utilisateur
const updateTheme = async (req, res, next) => {
  const userId = req.params.uid;
  const { themeId } = req.body;

  let user;

  try {
    user = await User.findById(userId);
  } catch (e) {
    console.error(e);
    return next(
      new HttpError("Erreur lors de la récupération de l'utilisateur.", 500),
    );
  }

  if (!user) {
    return res.status(404).json({
      message: "Utilisateur non trouvé.",
    });
  }

  try {
    user.themeActuel = themeId || null;
    await user.save();

    await user.populate("themeActuel");

    res.status(200).json({
      message: "Thème modifié avec succès.",
      themeActuel: user.themeActuel,
    });
  } catch (e) {
    console.error(e);
    return next(new HttpError("Impossible de modifier le thème.", 500));
  }
};

// PATCH - Modifier l'avatar actuel d'un utilisateur
const updateAvatar = async (req, res, next) => {
  const userId = req.params.uid;
  const { avatarId } = req.body;

  let user;

  try {
    user = await User.findById(userId);
  } catch (e) {
    console.error(e);
    return next(
      new HttpError("Erreur lors de la récupération de l'utilisateur.", 500),
    );
  }

  if (!user) {
    return res.status(404).json({
      message: "Utilisateur non trouvé.",
    });
  }

  try {
    user.avatarActuel = avatarId || null;
    await user.save();

    await user.populate("avatarActuel");

    res.status(200).json({
      message: "Avatar modifié avec succès.",
      avatarActuel: user.avatarActuel,
    });
  } catch (e) {
    console.error(e);
    return next(new HttpError("Impossible de modifier l'avatar.", 500));
  }
};

export default {
  getUsers,
  getUserById,
  register,
  login,
  updateTokens,
  updateTheme,
  updateAvatar,
};
