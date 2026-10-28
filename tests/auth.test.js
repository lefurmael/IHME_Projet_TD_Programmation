import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, hashSessionToken, normalizeEmail, verifyPassword } from "../server/auth.js";

test("passwords are stored as verifiable scrypt hashes", async () => {
  const hash = await hashPassword("motdepasse-securise");
  assert.notEqual(hash, "motdepasse-securise");
  assert.equal(await verifyPassword("motdepasse-securise", hash), true);
  assert.equal(await verifyPassword("autre-mot-de-passe", hash), false);
});

test("emails are normalized and session tokens are hashed", () => {
  assert.equal(normalizeEmail(" Nageur@Example.test "), "nageur@example.test");
  assert.notEqual(hashSessionToken("token-privé"), "token-privé");
});
