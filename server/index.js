import { createApp } from "./app.js";
import { migrate, pool } from "./db.js";

const port = Number(process.env.PORT || 3000);

try {
  await migrate();
  createApp(pool).listen(port, "0.0.0.0", () => {
    console.log(`Application prête sur le port ${port}.`);
  });
} catch (error) {
  console.error("Démarrage impossible :", error.message);
  await pool.end();
  process.exitCode = 1;
}