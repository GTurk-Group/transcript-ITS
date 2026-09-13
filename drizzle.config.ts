import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { existsSync } from "fs";

// Load env files in priority order:
//   .env.local  (local overrides, gitignored)
//   .env        (committed defaults)
// This mirrors how Next.js loads env files.
[".env.local", ".env"].forEach((file) => {
  if (existsSync(file)) {
    expand(config({ path: file, override: false }));
  }
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set.");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",

  dbCredentials: {
    url: process.env.DATABASE_URL,
    // Local PostgreSQL has no SSL — Neon/cloud URLs already contain sslmode=require
    ssl:
      process.env.DATABASE_URL.includes("sslmode=require") ||
      process.env.DATABASE_URL.includes("layerbase.com") ||
      process.env.DATABASE_URL.includes("supabase.co") ||
      process.env.NODE_ENV === "production",
  },

  verbose: true,
  strict: true,
});
