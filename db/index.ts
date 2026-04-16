/**
 * Database connection.
 *
 * Uses @neondatabase/serverless with Drizzle ORM.
 * The serverless driver works in Node.js, Edge Runtime, and Vercel serverless
 * functions without any code changes — it uses WebSockets instead of raw TCP
 * for environments that don't support TCP connections.
 *
 * For self-hosted PostgreSQL (not Neon), swap for:
 *   import { drizzle } from "drizzle-orm/postgres-js";
 *   import postgres from "postgres";
 *   const client = postgres(process.env.DATABASE_URL!);
 *   export const db = drizzle(client, { schema });
 *
 * For Supabase, the connection string from the dashboard works directly
 * with the Neon serverless driver (both use WebSocket-capable PostgreSQL).
 */

// import { neon }   from "@neondatabase/serverless";
// import { drizzle } from "drizzle-orm/neon-http";
// import * as schema from "./schema";

// if (!process.env.DATABASE_URL) {
//   throw new Error(
//     "DATABASE_URL is not set. Copy .env.example to .env.local and fill in the value."
//   );
// }

// neon() creates an HTTP-based SQL executor — no persistent connection pool.
// Each query creates an HTTP request to the Neon proxy.
// For high-frequency workloads, consider neonConfig.webSocketConstructor for WebSocket mode.
// const sql = neon(process.env.DATABASE_URL);

// export const db = drizzle(sql, { schema });

// export type DB = typeof db;

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in the value.",
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof drizzle> | undefined;
  // eslint-disable-next-line no-var
  var __client: ReturnType<typeof postgres> | undefined;
}

function createDb() {
  // max: 1 keeps a single connection in dev; raise to 10 for production
  const client = postgres(process.env.DATABASE_URL!, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    idle_timeout: 20,
    connect_timeout: 10,
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
