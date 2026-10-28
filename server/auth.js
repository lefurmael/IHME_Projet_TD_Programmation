import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64, SCRYPT_OPTIONS);
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password, encodedHash) {
  const [algorithm, n, r, p, saltHex, keyHex] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !/^\d+$/.test(n) || !/^\d+$/.test(r) || !/^\d+$/.test(p)) {
    return false;
  }
  const expected = Buffer.from(keyHex, "hex");
  if (expected.length !== 64) return false;
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });
  return timingSafeEqual(actual, expected);
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
