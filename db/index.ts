/**
 * db/index.ts — local PostgreSQL + Neon compatible.
 *
 * Local dev:  postgresql://postgres:password@localhost:5432/tms_dev
 * Neon/prod:  postgresql://user:pass@ep-xxx-pooler.neon.tech/tms?sslmode=require
 *
 * SSL is enabled automatically when the connection string contains
 * "sslmode=require" or "neon.tech". Local PostgreSQL needs no SSL.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set.\n" +
      "Local dev: postgresql://postgres:password@localhost:5432/tms_dev\n" +
      "Copy .env.example to .env.local and fill in the value.",
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof drizzle> | undefined;
  // eslint-disable-next-line no-var
  var __client: ReturnType<typeof postgres> | undefined;
}

function createDb() {
  const url = process.env.DATABASE_URL!;

  const requiresSsl =
    url.includes("sslmode=require") ||
    url.includes("neon.tech") ||
    url.includes("supabase.co") ||
    process.env.NODE_ENV === "production";

  const client = postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: requiresSsl ? "require" : false,
  });

  return { client, db: drizzle(client, { schema }) };
}

if (!globalThis.__db) {
  const { client, db } = createDb();
  globalThis.__client = client;
  globalThis.__db = db;
}

export const db = globalThis.__db!;
export type DB = typeof db;
