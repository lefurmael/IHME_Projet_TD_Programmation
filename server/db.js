import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL doit être configurée.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
});

export async function migrate(database = pool) {
  await database.query(`
    CREATE TABLE IF NOT EXISTS swim_sessions (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      level TEXT NOT NULL CHECK (level IN ('debutant', 'intermediaire', 'avance')),
      goal TEXT NOT NULL CHECK (goal IN ('endurance', 'technique', 'vitesse')),
      duration INTEGER NOT NULL CHECK (duration IN (30, 45, 60)),
      stroke TEXT NOT NULL CHECK (stroke IN ('crawl', 'dos', 'brasse', 'mixte')),
      warmup TEXT NOT NULL,
      main_sets JSONB NOT NULL,
      cooldown TEXT NOT NULL,
      total INTEGER NOT NULL CHECK (total > 0),
      volume_adjustment INTEGER NOT NULL DEFAULT 0,
      adjustment_reason TEXT NOT NULL DEFAULT '',
      feedback_saved BOOLEAN NOT NULL DEFAULT FALSE,
      completed TEXT CHECK (completed IN ('oui', 'partiellement', 'non')),
      feeling TEXT CHECK (feeling IN ('tres_facile', 'facile', 'adaptee', 'difficile', 'trop_difficile')),
      note VARCHAR(240) NOT NULL DEFAULT ''
    )
  `);
  await database.query(`
    CREATE INDEX IF NOT EXISTS swim_sessions_context_idx
    ON swim_sessions (level, goal, stroke, created_at DESC)
  `);
}