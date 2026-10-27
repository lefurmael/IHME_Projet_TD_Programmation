import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { calculateVolumeAdjustment, DURATIONS, generateSession, GOALS, LEVELS, STROKES } from "./session.js";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const publicOrigin = process.env.PUBLIC_ORIGIN;

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

  app.get("/api/sessions", async (_request, response, next) => {
    try {
      const result = await database.query(
        "SELECT * FROM swim_sessions ORDER BY created_at DESC, id DESC",
      );
      response.json(result.rows);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/sessions", async (request, response, next) => {
    const { level, goal, duration, stroke } = request.body ?? {};
    if (
      !Object.hasOwn(LEVELS, level)
      || !GOALS.includes(goal)
      || !DURATIONS.includes(Number(duration))
      || !STROKES.includes(stroke)
    ) {
      return response.status(400).json({ error: "Critères de séance invalides." });
    }

    try {
      const recent = await database.query(
        `SELECT completed, feeling FROM swim_sessions
         WHERE level = $1 AND goal = $2 AND stroke = $3
           AND feedback_saved = TRUE AND completed = 'oui'
         ORDER BY created_at DESC, id DESC LIMIT 3`,
        [level, goal, stroke],
      );
      const adjustment = calculateVolumeAdjustment(recent.rows);
      const session = generateSession({
        level,
        goal,
        duration: Number(duration),
        stroke,
        volumeFactor: adjustment.factor,
      });
      const result = await database.query(
        `INSERT INTO swim_sessions
          (level, goal, duration, stroke, warmup, main_sets, cooldown, total, volume_adjustment, adjustment_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [level, goal, Number(duration), stroke, session.warmup, JSON.stringify(session.mainSets), session.cooldown, session.total, session.volumeAdjustment, adjustment.reason],
      );
      response.status(201).json(result.rows[0]);
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
         WHERE id = $1 RETURNING *`,
        [request.params.id, completed, feeling, note.trim()],
      );
      if (!result.rowCount) {
        return response.status(404).json({ error: "Séance introuvable." });
      }
      response.json(result.rows[0]);
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