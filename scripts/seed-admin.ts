#!/usr/bin/env tsx
/**
 * Seed the first SUPER_ADMIN account.
 *
 * Usage:
 *   pnpm seed:admin --email admin@example.com --password yourpassword
 *
 * Safe to run multiple times — skips if email already exists.
 * Requires DATABASE_URL in the environment (loads .env.local automatically).
 *
 * The script loads environment variables from .env.local so you do not
 * need to export them manually before running.
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local before importing anything that reads process.env
config({ path: resolve(process.cwd(), ".env") });

import { db } from "../db";
import { admins } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/auth/passwords";

async function main() {
  // Parse CLI args
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const email = getArg("--email");
  const password = getArg("--password");
  const role = (getArg("--role") ?? "SUPER_ADMIN") as
    | "SUPER_ADMIN"
    | "ADMIN"
    | "VIEWER";

  if (!email || !password) {
    console.error(
      "Usage: pnpm seed:admin --email <email> --password <password> [--role SUPER_ADMIN|ADMIN|VIEWER]",
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  // Check if email already exists
  const existing = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Admin with email ${email} already exists. Skipping.`);
    process.exit(0);
  }

  // Hash password with bcrypt
  const hashed = await hashPassword(password);

  // Insert
  const [admin] = await db
    .insert(admins)
    .values({
      email: email.toLowerCase().trim(),
      password: hashed,
      role,
    })
    .returning({ id: admins.id, email: admins.email, role: admins.role });

  console.log(`✓ Admin created:`);
  console.log(`  ID:    ${admin.id}`);
  console.log(`  Email: ${admin.email}`);
  console.log(`  Role:  ${admin.role}`);
  console.log(`\nYou can now log in at /login`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
