import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { once } from "node:events";
import mongoose from "mongoose";
import {
  validateRegister,
  validateLogin,
  validateUidParam,
  validateThemeUpdate,
  validateAvatarUpdate,
  validatePurchaseItem,
  validateEquipItem,
  validateSettingsUpdate,
  isInstitutionalEmail,
} from "../middleware/validators.js";

test("isInstitutionalEmail validates only Cégep Montmorency domains", () => {
  assert.equal(isInstitutionalEmail("etudiant@cmontmorency.qc.ca"), true);
  assert.equal(isInstitutionalEmail("prof@courrier.cmontmorency.qc.ca"), true);
  assert.equal(isInstitutionalEmail("user@sub.cmontmorency.qc.ca"), true);
  assert.equal(isInstitutionalEmail("user@gmail.com"), false);
  assert.equal(isInstitutionalEmail("user@notcmontmorency.qc.ca"), false);
  assert.equal(isInstitutionalEmail("user@cmontmorency.qc.ca.fake.com"), false);
  assert.equal(isInstitutionalEmail("invalid-email"), false);
  assert.equal(isInstitutionalEmail(null), false);
});

test("validateRegister rejects invalid registration payloads and accepts valid ones", async (t) => {
  const app = express();
  app.use(express.json());
  app.post("/register", validateRegister, (req, res) => {
    res.status(200).json({ ok: true });
  });

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))));

  const url = `http://127.0.0.1:${server.address().port}/register`;
  const post = (body) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  // 1. Inscription sans nom d'utilisateur
  const noUser = await post({
    username: "",
    email: "test@cmontmorency.qc.ca",
    password: "secretpassword",
  });
  assert.equal(noUser.status, 400);
  const noUserData = await noUser.json();
  assert.equal(noUserData.message, "Nom d'utilisateur requis.");

  // 2. Nom d'utilisateur trop court (< 3 caractères)
  const shortUser = await post({
    username: "ab",
    email: "test@cmontmorency.qc.ca",
    password: "secretpassword",
  });
  assert.equal(shortUser.status, 400);
  const shortUserData = await shortUser.json();
  assert.equal(
    shortUserData.message,
    "Le nom d'utilisateur doit contenir au moins 3 caractères.",
  );

  // 3. Courriel non institutionnel
  const invalidEmail = await post({
    username: "jdoe",
    email: "jdoe@gmail.com",
    password: "secretpassword",
  });
  assert.equal(invalidEmail.status, 400);
  const invalidEmailData = await invalidEmail.json();
  assert.equal(
    invalidEmailData.message,
    "Veuillez utiliser une adresse courriel du Cégep Montmorency.",
  );

  // 4. Mot de passe trop court
  const shortPass = await post({
    username: "jdoe",
    email: "jdoe@cmontmorency.qc.ca",
    password: "12",
  });
  assert.equal(shortPass.status, 400);
  const shortPassData = await shortPass.json();
  assert.equal(
    shortPassData.message,
    "Le mot de passe doit contenir au moins 3 caractères.",
  );

  // 5. Inscription valide
  const valid = await post({
    username: "jdoe",
    email: "jdoe@cmontmorency.qc.ca",
    password: "superpassword",
  });
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { ok: true });
});

test("validateLogin enforces valid username and password fields", async (t) => {
  const app = express();
  app.use(express.json());
  app.post("/login", validateLogin, (req, res) => res.json({ ok: true }));

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))));

  const url = `http://127.0.0.1:${server.address().port}/login`;
  const post = (body) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const emptyUser = await post({ username: "", password: "password" });
  assert.equal(emptyUser.status, 400);

  const emptyPass = await post({ username: "jdoe", password: "" });
  assert.equal(emptyPass.status, 400);

  const valid = await post({ username: "jdoe", password: "password" });
  assert.equal(valid.status, 200);
});

test("validateThemeUpdate and validateAvatarUpdate enforce ObjectId format", async (t) => {
  const app = express();
  app.use(express.json());
  app.patch("/:uid/theme", validateThemeUpdate, (req, res) => res.json({ ok: true }));
  app.patch("/:uid/avatar", validateAvatarUpdate, (req, res) => res.json({ ok: true }));

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))));

  const base = `http://127.0.0.1:${server.address().port}`;
  const validUid = new mongoose.Types.ObjectId().toString();
  const validItemId = new mongoose.Types.ObjectId().toString();

  // UID invalide
  const badUid = await fetch(`${base}/not-an-id/theme`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ themeActuel: validItemId }),
  });
  assert.equal(badUid.status, 400);

  // themeActuel invalide
  const badTheme = await fetch(`${base}/${validUid}/theme`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ themeActuel: "invalid-id" }),
  });
  assert.equal(badTheme.status, 400);

  // themeActuel valide
  const goodTheme = await fetch(`${base}/${validUid}/theme`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ themeActuel: validItemId }),
  });
  assert.equal(goodTheme.status, 200);

  // themeActuel null (déséquiper)
  const nullTheme = await fetch(`${base}/${validUid}/theme`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ themeActuel: null }),
  });
  assert.equal(nullTheme.status, 200);
});

test("validatePurchaseItem and validateEquipItem enforce kind and itemId", async (t) => {
  const app = express();
  app.use(express.json());
  app.post("/:uid/purchase", validatePurchaseItem, (req, res) => res.json({ ok: true }));
  app.patch("/:uid/equip", validateEquipItem, (req, res) => res.json({ ok: true }));

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))));

  const base = `http://127.0.0.1:${server.address().port}`;
  const validUid = new mongoose.Types.ObjectId().toString();
  const validItemId = new mongoose.Types.ObjectId().toString();

  // Mauvais kind
  const badKind = await fetch(`${base}/${validUid}/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "weapon", itemId: validItemId }),
  });
  assert.equal(badKind.status, 400);

  // itemId invalide
  const badItem = await fetch(`${base}/${validUid}/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "theme", itemId: "invalid" }),
  });
  assert.equal(badItem.status, 400);

  // Achat valide
  const goodPurchase = await fetch(`${base}/${validUid}/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "avatar", itemId: validItemId }),
  });
  assert.equal(goodPurchase.status, 200);
});

test("validateSettingsUpdate enforces object and boolean values", async (t) => {
  const app = express();
  app.use(express.json());
  app.patch("/:uid/settings", validateSettingsUpdate, (req, res) => res.json({ ok: true }));

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))));

  const base = `http://127.0.0.1:${server.address().port}`;
  const validUid = new mongoose.Types.ObjectId().toString();

  // Settings non-objet
  const notObject = await fetch(`${base}/${validUid}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings: "true" }),
  });
  assert.equal(notObject.status, 400);

  // Valeur non-booléenne
  const notBool = await fetch(`${base}/${validUid}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings: { turnByTurnGuidance: "yes" } }),
  });
  assert.equal(notBool.status, 400);

  // Valide
  const valid = await fetch(`${base}/${validUid}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      settings: {
        turnByTurnGuidance: true,
        showSchoolInsights: false,
        reducedMotion: true,
      },
    }),
  });
  assert.equal(valid.status, 200);
});

