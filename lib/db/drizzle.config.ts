import { defineConfig } from "drizzle-kit";
import path from "path";

const DB_URL = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  throw new Error("DATABASE_URL or SUPABASE_DB_URL must be set");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: DB_URL,
  },
});
