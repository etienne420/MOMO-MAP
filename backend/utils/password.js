import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SCRYPT_COST = 1 << 15;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

async function deriveKey(password, salt, keyLength) {
  return scrypt(password, salt, keyLength, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
    maxmem: MAX_MEMORY,
  });
}

export async function hashPassword(password) {
  if (typeof password !== "string") {
    throw new TypeError("Le mot de passe doit être une chaîne de caractères.");
  }

  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password, storedHash) {
  if (typeof password !== "string" || typeof storedHash !== "string") {
    return false;
  }

  const [algorithm, saltValue, hashValue, ...extraParts] = storedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    !saltValue ||
    !hashValue ||
    extraParts.length > 0
  ) {
    return false;
  }

  const salt = Buffer.from(saltValue, "base64url");
  const expectedHash = Buffer.from(hashValue, "base64url");
  if (salt.length !== 16 || expectedHash.length !== KEY_LENGTH) {
    return false;
  }

  const actualHash = await deriveKey(password, salt, expectedHash.length);
  return timingSafeEqual(actualHash, expectedHash);
}
