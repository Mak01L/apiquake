import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __pool?: Pool };

function getPool(): Pool {
  if (!globalForDb.__pool) {
    globalForDb.__pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgres://postgres:postgres@localhost:5432/apiquake",
      // conservative pool for small self-hosted boxes (i3 / 16 GB)
      max: Number.parseInt(process.env.DB_POOL_MAX ?? "10", 10),
    });
  }
  return globalForDb.__pool;
}

export const pool = getPool();
export const db = drizzle(pool, { schema });
export * as schema from "./schema";
