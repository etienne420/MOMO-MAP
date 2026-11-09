import { authenticateToken } from "./auth.js";

// Compatibilité : checkAuth est un alias de authenticateToken.
// Il valide le JWT (signature, expiration, sub et role) et renseigne req.auth.
const checkAuth = authenticateToken();

export default checkAuth;
