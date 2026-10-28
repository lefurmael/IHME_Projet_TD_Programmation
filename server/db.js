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
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS swim_users (
        id BIGSERIAL PRIMARY KEY,
        email VARCHAR(254) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS swim_sessions (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES swim_users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        level TEXT NOT NULL CHECK (level IN ('debutant', 'intermediaire', 'avance')),
        goal TEXT NOT NULL CHECK (goal IN ('endurance', 'technique', 'vitesse')),
        duration INTEGER NOT NULL CHECK (duration IN (30, 45, 60)),
        stroke TEXT NOT NULL CHECK (stroke IN ('crawl', 'dos', 'brasse', 'mixte')),
        pool_length INTEGER NOT NULL DEFAULT 25 CHECK (pool_length IN (25, 50)),
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
    await client.query(`
      ALTER TABLE swim_sessions
      ADD COLUMN IF NOT EXISTS pool_length INTEGER NOT NULL DEFAULT 25
    `);
    await client.query(`
      ALTER TABLE swim_sessions
      ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES swim_users(id) ON DELETE CASCADE
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token_hash CHAR(64) PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES swim_users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS swim_tests (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES swim_users(id) ON DELETE CASCADE,
        distance INTEGER NOT NULL CHECK (distance IN (50, 200, 400)),
        elapsed_seconds INTEGER NOT NULL CHECK (elapsed_seconds > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    if (process.env.NODE_ENV === "production") {
      const reset = await client.query(`
        INSERT INTO app_migrations (name)
        VALUES ('personal_accounts_and_history_reset')
        ON CONFLICT DO NOTHING
        RETURNING name
      `);
      if (reset.rowCount) {
        await client.query("TRUNCATE TABLE swim_sessions RESTART IDENTITY");
      }
    }
    const unassigned = await client.query(
      "SELECT COUNT(*) AS count FROM swim_sessions WHERE user_id IS NULL",
    );
    if (Number(unassigned.rows[0].count) === 0) {
      await client.query("ALTER TABLE swim_sessions ALTER COLUMN user_id SET NOT NULL");
    } else {
      console.warn("Des séances locales existantes restent sans compte et ne sont visibles dans aucun carnet.");
    }
    await client.query(`
      CREATE INDEX IF NOT EXISTS swim_sessions_user_context_idx
      ON swim_sessions (user_id, level, goal, stroke, pool_length, created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS swim_tests_user_date_idx
      ON swim_tests (user_id, created_at DESC)
    `);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}