import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import test from "node:test";
import { createAuthRouter } from "../routes/auth.js";

const JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";

function createUserModel(users) {
  return {
    async findOne({ $or }) {
      return (
        users.find((user) =>
          $or.some((condition) => {
            const [key, expected] = Object.entries(condition)[0] ?? [];
            if (expected instanceof RegExp) {
              return expected.test(user[key] ?? "");
            }
            return user[key] === expected;
          }),
        ) ?? null
      );
    },
    async create(values) {
      if (users.some((user) => user.username === values.username)) {
        const error = new Error("Duplicate username");
        error.code = 11000;
        throw error;
      }

      const user = { ...values, _id: `user-${users.length + 1}` };
      users.push(user);
      return user;
    },
  };
}

test("auth endpoints match the frontend request and JWT contract", async (t) => {
  const users = [];
  const app = express();
  app.use(express.json());
  app.use(
    "/auth",
    createAuthRouter({
      UserModel: createUserModel(users),
      jwtSecret: JWT_SECRET,
    }),
  );

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );

  const baseUrl = `http://127.0.0.1:${server.address().port}/auth`;
  const post = (path, body) =>
    fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const registration = await post("/register", {
    username: "MapUser",
    email: "MapUser@cmontmorency.qc.ca",
    password: "map-password",
    role: "admin",
  });
  assert.equal(registration.status, 201);

  const registrationResult = await registration.json();
  assert.equal(typeof registrationResult.token, "string");
  const registrationClaims = jwt.verify(registrationResult.token, JWT_SECRET);
  assert.equal(registrationClaims.role, "user");
  assert.equal(registrationClaims.sub, "user-1");
  assert.ok(registrationClaims.exp > registrationClaims.iat);
  assert.notEqual(users[0].password, "map-password");
  assert.equal(users[0].username, "mapuser");

  const duplicateRegistration = await post("/register", {
    username: "mapuser",
    email: "another@cmontmorency.qc.ca",
    password: "map-password",
  });
  assert.equal(duplicateRegistration.status, 409);

  const invalidRegistration = await post("/register", {
    username: "OtherUser",
    email: "other@example.com",
    password: "map-password",
  });
  assert.equal(invalidRegistration.status, 400);

  const usernameLogin = await post("/login", {
    username: "MAPUSER",
    password: "map-password",
  });
  assert.equal(usernameLogin.status, 200);
  const usernameLoginResult = await usernameLogin.json();
  assert.equal(typeof usernameLoginResult.token, "string");
  const loginClaims = jwt.verify(usernameLoginResult.token, JWT_SECRET);
  assert.equal(loginClaims.sub, "user-1");
  assert.equal(loginClaims.role, "user");
  assert.ok(loginClaims.exp > loginClaims.iat);

  const emailLogin = await post("/login", {
    username: "mapuser@cmontmorency.qc.ca",
    password: "map-password",
  });
  assert.equal(emailLogin.status, 200);
  assert.equal(typeof (await emailLogin.json()).token, "string");

  const invalidLogin = await post("/login", {
    username: "mapuser",
    password: "wrong-password",
  });
  assert.equal(invalidLogin.status, 401);
  assert.deepEqual(await invalidLogin.json(), {
    message: "Identifiants invalides.",
  });
});
