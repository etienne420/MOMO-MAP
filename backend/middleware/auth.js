import jwt from "jsonwebtoken";

const VALID_ROLES = new Set(["user", "admin"]);

function assertJwtSecret(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    const error = new Error(
      "JWT_SECRET doit être configuré avec au moins 32 caractères.",
    );
    error.code = 500;
    throw error;
  }
}

export function authenticateToken({ jwtSecret = process.env.JWT_SECRET } = {}) {
  return (req, res, next) => {
    try {
      assertJwtSecret(jwtSecret);
    } catch (error) {
      return next(error);
    }

    const authorization = req.get("authorization");
    const match =
      typeof authorization === "string" &&
      authorization.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      return res.status(401).json({ message: "Authentification requise." });
    }

    let claims;
    try {
      claims = jwt.verify(match[1], jwtSecret, {
        algorithms: ["HS256"],
      });
    } catch {
      return res.status(401).json({ message: "Jeton invalide ou expiré." });
    }

    if (
      !claims ||
      typeof claims !== "object" ||
      typeof claims.sub !== "string" ||
      !claims.sub ||
      !VALID_ROLES.has(claims.role)
    ) {
      return res.status(401).json({ message: "Jeton invalide." });
    }

    req.auth = { userId: claims.sub, role: claims.role };
    return next();
  };
}

export function authorizeRoles(...allowedRoles) {
  if (
    allowedRoles.length === 0 ||
    allowedRoles.some((role) => !VALID_ROLES.has(role))
  ) {
    throw new TypeError("Les rôles autorisés doivent être user ou admin.");
  }

  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ message: "Authentification requise." });
    }
    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ message: "Accès interdit." });
    }
    return next();
  };
}
