import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  isValidEmail,
  normalizeEmail,
  verifyPassword,
} from "./auth.js";
import { calculateVolumeAdjustment, DURATIONS, generateSession, GOALS, LEVELS, POOL_LENGTHS, STROKES } from "./session.js";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const publicOrigin = process.env.PUBLIC_ORIGIN;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const COOKIE_PATH = process.env.BASE_PATH?.startsWith("/")
  ? process.env.BASE_PATH
  : "/";

function readSessionToken(request) {
  const cookie = request.headers.cookie?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("ligne_eau_session="));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice("ligne_eau_session=".length));
  } catch {
    return null;
  }
}

function sessionCookie(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `ligne_eau_session=${encodeURIComponent(token)}; Path=${COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `ligne_eau_session=; Path=${COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

async function findUserForRequest(database, request) {
  const token = readSessionToken(request);
  if (!token) return null;
  const result = await database.query(
    `SELECT users.id, users.email
     FROM auth_sessions AS sessions
     JOIN swim_users AS users ON users.id = sessions.user_id
     WHERE sessions.token_hash = $1 AND sessions.expires_at > NOW()`,
    [hashSessionToken(token)],
  );
  return result.rows[0] ?? null;
}

export function createApp(database) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));
  app.use(express.json({ limit: "10kb" }));
  app.use((request, response, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && request.get("origin") && publicOrigin) {
      try {
        if (new URL(request.get("origin")).origin !== new URL(publicOrigin).origin) {
          return response.status(403).json({ error: "Origine refusée." });
        }
      } catch {
        return response.status(403).json({ error: "Origine refusée." });
      }
    }
    next();
  });

  app.get("/api/health", async (_request, response) => {
    try {
      await database.query("SELECT 1");
      response.json({ status: "ok" });
    } catch {
      response.status(503).json({ status: "unavailable" });
    }
  });

  app.get("/api/auth/me", async (request, response, next) => {
    try {
      response.json({ user: await findUserForRequest(database, request) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/register", async (request, response, next) => {
    const email = typeof request.body?.email === "string" ? normalizeEmail(request.body.email) : "";
    const password = request.body?.password;
    if (!isValidEmail(email) || typeof password !== "string" || password.length < 10 || password.length > 128) {
      return response.status(400).json({ error: "Indique une adresse e-mail valide et un mot de passe de 10 à 128 caractères." });
    }

    try {
      const passwordHash = await hashPassword(password);
      const result = await database.query(
        "INSERT INTO swim_users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
        [email, passwordHash],
      );
      const user = result.rows[0];
      const token = createSessionToken();
      await database.query(
        "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
        [hashSessionToken(token), user.id],
      );
      response.setHeader("Set-Cookie", sessionCookie(token));
      response.status(201).json({ user });
    } catch (error) {
      if (error.code === "23505") {
        return response.status(409).json({ error: "Un compte existe déjà pour cette adresse e-mail." });
      }
      next(error);
    }
  });

  app.post("/api/auth/login", async (request, response, next) => {
    const email = typeof request.body?.email === "string" ? normalizeEmail(request.body.email) : "";
    const password = request.body?.password;
    if (!isValidEmail(email) || typeof password !== "string" || password.length > 128) {
      return response.status(400).json({ error: "Adresse e-mail ou mot de passe invalide." });
    }

    try {
      const result = await database.query(
        "SELECT id, email, password_hash FROM swim_users WHERE email = $1",
        [email],
      );
      const user = result.rows[0];
      if (!user || !(await verifyPassword(password, user.password_hash))) {
        return response.status(401).json({ error: "Adresse e-mail ou mot de passe incorrect." });
      }
      const token = createSessionToken();
      await database.query(
        "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
        [hashSessionToken(token), user.id],
      );
      response.setHeader("Set-Cookie", sessionCookie(token));
      response.json({ user: { id: user.id, email: user.email } });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/logout", async (request, response, next) => {
    try {
      const token = readSessionToken(request);
      if (token) {
        await database.query("DELETE FROM auth_sessions WHERE token_hash = $1", [hashSessionToken(token)]);
      }
      response.setHeader("Set-Cookie", clearSessionCookie());
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.use(["/api/sessions", "/api/tests"], async (request, response, next) => {
    try {
      request.user = await findUserForRequest(database, request);
      if (!request.user) {
        return response.status(401).json({ error: "Connecte-toi pour accéder à ton carnet." });
      }
      next();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/sessions", async (_request, response, next) => {
    try {
      const result = await database.query(
        "SELECT * FROM swim_sessions WHERE user_id = $1 ORDER BY created_at DESC, id DESC",
        [_request.user.id],
      );
      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/sessions", async (request, response, next) => {
    const { level, goal, duration, stroke } = request.body ?? {};
    const poolLength = Number(request.body?.poolLength);
    if (
      !Object.hasOwn(LEVELS, level)
      || !GOALS.includes(goal)
      || !DURATIONS.includes(Number(duration))
      || !STROKES.includes(stroke)
      || !POOL_LENGTHS.includes(poolLength)
    ) {
      return response.status(400).json({ error: "Critères de séance invalides." });
    }

    try {
      const recent = await database.query(
        `SELECT completed, feeling FROM swim_sessions
         WHERE user_id = $1 AND level = $2 AND goal = $3 AND stroke = $4
           AND pool_length = $5 AND feedback_saved = TRUE AND completed = 'oui'
         ORDER BY created_at DESC, id DESC LIMIT 3`,
        [request.user.id, level, goal, stroke, poolLength],
      );
      const adjustment = calculateVolumeAdjustment(recent.rows);
      const session = generateSession({
        level,
        goal,
        duration: Number(duration),
        stroke,
        poolLength,
        volumeFactor: adjustment.factor,
      });
      const result = await database.query(
        `INSERT INTO swim_sessions
          (user_id, level, goal, duration, stroke, pool_length, warmup, main_sets, cooldown, total, volume_adjustment, adjustment_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [request.user.id, level, goal, Number(duration), stroke, poolLength, session.warmup, JSON.stringify(session.mainSets), session.cooldown, session.total, session.volumeAdjustment, adjustment.reason],
      );
      response.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/sessions/:id", async (request, response, next) => {
    if (!/^\d+$/.test(request.params.id)) {
      return response.status(404).json({ error: "Séance introuvable." });
    }
    try {
      const result = await database.query(
        "DELETE FROM swim_sessions WHERE id = $1 AND user_id = $2 RETURNING id",
        [request.params.id, request.user.id],
      );
      if (!result.rowCount) {
        return response.status(404).json({ error: "Séance introuvable." });
      }
      response.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/sessions/:id/feedback", async (request, response, next) => {
    const { completed, feeling, note = "" } = request.body ?? {};
    if (
      !["oui", "partiellement", "non"].includes(completed)
      || !["tres_facile", "facile", "adaptee", "difficile", "trop_difficile"].includes(feeling)
      || typeof note !== "string"
      || note.length > 240
    ) {
      return response.status(400).json({ error: "Bilan invalide." });
    }
    try {
      const result = await database.query(
        `UPDATE swim_sessions
         SET feedback_saved = TRUE, completed = $2, feeling = $3, note = $4
         WHERE id = $1 AND user_id = $5 RETURNING *`,
        [request.params.id, completed, feeling, note.trim(), request.user.id],
      );
      if (!result.rowCount) {
        return response.status(404).json({ error: "Séance introuvable." });
      }
      response.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/tests", async (request, response, next) => {
    try {
      const result = await database.query(
        "SELECT * FROM swim_tests WHERE user_id = $1 ORDER BY created_at DESC, id DESC",
        [request.user.id],
      );
      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/tests", async (request, response, next) => {
    const { distance, elapsedSeconds } = request.body ?? {};
    if (
      ![50, 200, 400].includes(distance)
      || !Number.isSafeInteger(distance)
      || !Number.isSafeInteger(elapsedSeconds)
      || elapsedSeconds < 1
      || elapsedSeconds > 86400
    ) {
      return response.status(400).json({ error: "Choisis 50, 200 ou 400 m et indique un temps valide." });
    }
    try {
      const result = await database.query(
        `INSERT INTO swim_tests (user_id, distance, elapsed_seconds)
         VALUES ($1, $2, $3) RETURNING *`,
        [request.user.id, distance, elapsedSeconds],
      );
      response.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  app.use("/api", (_request, response) => response.status(404).json({ error: "Route API inconnue." }));
  app.use(express.static(path.join(projectRoot, "dist"), { index: false, maxAge: "1h" }));
  app.get("/{*path}", (_request, response) => {
    response.sendFile(path.join(projectRoot, "dist", "index.html"));
  });
  app.use((error, _request, response, _next) => {
    console.error("Request failed:", error.message);
    response.status(500).json({ error: "Erreur interne." });
  });
  return app;
}