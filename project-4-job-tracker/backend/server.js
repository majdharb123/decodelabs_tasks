import "dotenv/config";
import app from "./app.js";
import pool from "./config/db.js";

const port = Number(process.env.PORT || 3000);

try {
  const result = await pool.query(
    "SELECT current_database() AS database_name"
  );

  await pool.query(
    "SELECT 1 FROM public.applications LIMIT 1"
  );

  console.log(
    "PostgreSQL connected:",
    result.rows[0].database_name
  );

  app.listen(port, "0.0.0.0", () => {
    console.log(`Job Tracker API: http://localhost:${port}`);
  });
} catch (error) {
  console.error(
    "Database startup check failed:",
    error.code || error.message
  );

  await pool.end();
  process.exitCode = 1;
}