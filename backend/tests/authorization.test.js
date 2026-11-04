import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import test from "node:test";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.js";

const JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";

test("authentication middleware enforces JWT validity and roles", async (t) => {
  const app = express();
  app.get(
    "/admin",
    authenticateToken({ jwtSecret: JWT_SECRET }),
    authorizeRoles("admin"),
    (req, res) => res.json({ userId: req.auth.userId }),
  );

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );

  const url = `http://127.0.0.1:${server.address().port}/admin`;
  const get = (token) =>
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  const signToken = (payload, expiresIn = "1h") =>
    jwt.sign(payload, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn,
    });

  assert.equal((await get()).status, 401);

  const userToken = signToken({ sub: "user-1", role: "user" });
  const forbidden = await get(userToken);
  assert.equal(forbidden.status, 403);

  const adminToken = signToken({ sub: "admin-1", role: "admin" });
  const allowed = await get(adminToken);
  assert.equal(allowed.status, 200);
  assert.deepEqual(await allowed.json(), { userId: "admin-1" });

  const expiredToken = signToken(
    { sub: "admin-1", role: "admin" },
    "-1s",
  );
  assert.equal((await get(expiredToken)).status, 401);

  const invalidRoleToken = signToken({ sub: "user-1", role: "owner" });
  assert.equal((await get(invalidRoleToken)).status, 401);
});
