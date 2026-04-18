import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url =
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/apiquake";
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);
  console.log("[migrate] running migrations against", url.replace(/:[^:@/]+@/, ":***@"));
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  await pool.end();
  console.log("[migrate] done");
}

main().catch((err) => {
  console.error("[migrate] failed", err);
  process.exit(1);
});
