import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
}

declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof drizzle> | undefined;
  // eslint-disable-next-line no-var
  var __client: ReturnType<typeof postgres> | undefined;
}

function createDb() {
  const url = process.env.DATABASE_URL!;

  // Use SSL whenever the connection string requires it (Neon, Supabase, etc.)
  // or when running in production. Local PostgreSQL installs don't need SSL.
  const requiresSsl =
    url.includes("sslmode=require") ||
    url.includes("neon.tech") ||
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
