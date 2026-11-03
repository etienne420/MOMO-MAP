import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/users.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSTITUTIONAL_DOMAIN = "cmontmorency.qc.ca";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isInstitutionalEmail(email) {
  if (!EMAIL_PATTERN.test(email)) {
    return false;
  }

  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  return (
    domain === INSTITUTIONAL_DOMAIN ||
    domain.endsWith(`.${INSTITUTIONAL_DOMAIN}`)
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertJwtSecret(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    const error = new Error(
      "JWT_SECRET doit être configuré avec au moins 32 caractères.",
    );
    error.code = 500;
    throw error;
  }
}

function createAccessToken(user, secret) {
  assertJwtSecret(secret);
  const role = user.role === "admin" ? "admin" : "user";
  return jwt.sign(
    { role },
    secret,
    {
      algorithm: "HS256",
      expiresIn: "1h",
      subject: user._id.toString(),
    },
  );
}

function sendInvalidRequest(res, message) {
  return res.status(400).json({ message });
}

export function createAuthRouter({
  UserModel = User,
  jwtSecret = process.env.JWT_SECRET,
} = {}) {
  const router = Router();

  router.post("/register", async (req, res, next) => {
    if (!isObject(req.body)) {
      return sendInvalidRequest(res, "Les informations du compte sont invalides.");
    }

    const { username, email, password } = req.body;
    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return sendInvalidRequest(res, "Nom, courriel et mot de passe requis.");
    }

    const cleanUsername = username.trim();
    const normalizedUsername = cleanUsername.toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (cleanUsername.length < 3) {
      return sendInvalidRequest(
        res,
        "Le nom d’utilisateur doit contenir au moins 3 caractères.",
      );
    }
    if (!isInstitutionalEmail(normalizedEmail)) {
      return sendInvalidRequest(
        res,
        "Veuillez utiliser une adresse courriel du Cégep Montmorency.",
      );
    }
    if (password.length < 6) {
      return sendInvalidRequest(
        res,
        "Le mot de passe doit contenir au moins 6 caractères.",
      );
    }

    const usernamePattern = new RegExp(
      `^${escapeRegExp(cleanUsername)}$`,
      "i",
    );
    const emailPattern = new RegExp(
      `^${escapeRegExp(normalizedEmail)}$`,
      "i",
    );

    try {
      assertJwtSecret(jwtSecret);
      const existingUser = await UserModel.findOne({
        $or: [
          { username: normalizedUsername },
          { name: usernamePattern },
          { email: emailPattern },
        ],
      });

      if (existingUser) {
        return res
          .status(409)
          .json({ message: "Ce nom d’utilisateur ou courriel est déjà utilisé." });
      }

      const user = await UserModel.create({
        name: cleanUsername,
        username: normalizedUsername,
        email: normalizedEmail,
        password: await hashPassword(password),
        role: "user",
      });

      return res.status(201).json({ token: createAccessToken(user, jwtSecret) });
    } catch (error) {
      if (error?.code === 11000) {
        return res
          .status(409)
          .json({ message: "Ce nom d’utilisateur ou courriel est déjà utilisé." });
      }
      return next(error);
    }
  });

  router.post("/login", async (req, res, next) => {
    if (!isObject(req.body)) {
      return sendInvalidRequest(res, "Les identifiants sont invalides.");
    }

    const { username, password } = req.body;
    if (
      typeof username !== "string" ||
      !username.trim() ||
      typeof password !== "string" ||
      password.length < 6
    ) {
      return sendInvalidRequest(res, "Nom d’utilisateur et mot de passe requis.");
    }

    const identifierPattern = new RegExp(
      `^${escapeRegExp(username.trim())}$`,
      "i",
    );

    try {
      assertJwtSecret(jwtSecret);
      const user = await UserModel.findOne({
        $or: [
          { username: identifierPattern },
          { name: identifierPattern },
          { email: identifierPattern },
        ],
      });

      if (!user || !(await verifyPassword(password, user.password))) {
        return res.status(401).json({ message: "Identifiants invalides." });
      }

      return res.json({ token: createAccessToken(user, jwtSecret) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
