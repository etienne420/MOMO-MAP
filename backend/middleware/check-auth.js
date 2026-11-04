import jwt from "jsonwebtoken";

function assertJwtSecret(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    const error = new Error(
      "JWT_SECRET doit être configuré avec au moins 32 caractères.",
    );
    error.code = 500;
    throw error;
  }
}

const checkAuth = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  const jwtSecret = process.env.JWT_SECRET;

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
    return res.status(401).json({
      message: "Authentification requise.",
    });
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(match[1], jwtSecret, {
      algorithms: ["HS256"],
    });
  } catch (error) {
    return res.status(401).json({
      message: "Jeton invalide ou expiré.",
    });
  }

  if (
    !decodedToken ||
    typeof decodedToken !== "object" ||
    typeof decodedToken.sub !== "string" ||
    !decodedToken.sub
  ) {
    return res.status(401).json({
      message: "Jeton invalide.",
    });
  }

  req.auth = {
    userId: decodedToken.sub,
  };

  req.userData = {
    userId: decodedToken.sub,
  };

  return next();
};

export default checkAuth;
