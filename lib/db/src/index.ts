import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL or SUPABASE_DB_URL must be set.",
  );
}

export const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";
