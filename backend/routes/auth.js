import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/users.js";
import { validateRegister, validateLogin } from "../middleware/validators.js";

const BCRYPT_ROUNDS = 10;

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
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role === "admin" ? "admin" : "user",
      username: user.username,
    },
    secret,
    {
      algorithm: "HS256",
      expiresIn: "1h",
    },
  );
}

export function createAuthRouter({
  UserModel = User,
  jwtSecret = process.env.JWT_SECRET,
} = {}) {
  const router = Router();

  router.post("/register", validateRegister, async (req, res, next) => {
    const { username, email, password } = req.body;
    const cleanUsername = username.trim();
    const normalizedUsername = cleanUsername.toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    try {
      assertJwtSecret(jwtSecret);

      const existingUser = await UserModel.findOne({
        $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
      });

      if (existingUser) {
        return res
          .status(409)
          .json({ message: "Ce nom d'utilisateur ou courriel est déjà utilisé." });
      }

      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = await UserModel.create({
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashedPassword,
        role: "user",
      });

      const token = createAccessToken(user, jwtSecret);
      return res.status(201).json({ token, accessToken: token });
    } catch (error) {
      if (error?.code === 11000) {
        return res
          .status(409)
          .json({ message: "Ce nom d'utilisateur ou courriel est déjà utilisé." });
      }
      return next(error);
    }
  });

  router.post("/login", validateLogin, async (req, res, next) => {
    const { username, password } = req.body;
    const normalizedIdentifier = username.trim().toLowerCase();

    try {
      assertJwtSecret(jwtSecret);

      const user = await UserModel.findOne({
        $or: [
          { username: normalizedIdentifier },
          { email: normalizedIdentifier },
        ],
      });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Identifiants invalides." });
      }

      const token = createAccessToken(user, jwtSecret);
      return res.json({ token, accessToken: token });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

export default createAuthRouter;

