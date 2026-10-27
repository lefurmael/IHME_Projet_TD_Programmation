import { migrate, pool } from "./db.js";

try {
  await migrate();
  console.log("Migration terminée.");
} finally {
  await pool.end();
}