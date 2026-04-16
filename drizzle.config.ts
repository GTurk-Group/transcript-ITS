import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required.");
}

export default defineConfig({
  // Schema file that defines all tables
  schema: "./db/schema.ts",

  // Output directory for generated migration SQL files
  out: "./db/migrations",

  // PostgreSQL dialect
  dialect: "postgresql",

  dbCredentials: {
    url: process.env.DATABASE_URL,
  },

  // Print verbose SQL during migrations (useful for debugging)
  verbose: true,

  // Enforce strict mode — errors on destructive migrations without explicit confirmation
  strict: true,
});
