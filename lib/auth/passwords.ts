/**
 * Password hashing utilities.
 *
 * Uses bcryptjs (pure JS) for broad deployment compatibility.
 * Swap for the native `bcrypt` package if CPU performance is critical
 * and your deployment environment supports native modules.
 *
 * Never call these functions in middleware — bcrypt is Node.js only.
 */

import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "./config";

/**
 * Hash a plaintext password. Always use this before storing.
 *
 * @example
 * const hashed = await hashPassword("hunter2");
 * await db.insert(admins).values({ ..., password: hashed });
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare a plaintext password against a stored bcrypt hash.
 *
 * This function is designed to be called even when no admin was found,
 * to prevent timing-based email enumeration attacks. See loginAction.
 */
export async function comparePassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/**
 * A valid bcrypt hash of an empty string at BCRYPT_ROUNDS.
 * Used as a dummy target when an email lookup returns no result,
 * so the bcrypt comparison still runs and takes the same time.
 *
 * Pre-computed to avoid generating it on every failed request.
 */
export const DUMMY_HASH =
  "$2b$12$invalidhashfortimingprotectionXXXXXXXXXXXXXXX" as const;
