/**
 * Session management for Server Components and Server Actions.
 *
 * ⚠️  Do NOT import this file in middleware.ts.
 *     `next/headers` is a Node.js-only API — importing it in the Edge Runtime
 *     will throw at build time. Middleware manages cookies directly via
 *     NextRequest / NextResponse. See middleware.ts.
 */

import { cookies } from "next/headers";
import { COOKIE_NAME, COOKIE_OPTIONS } from "./config";
import { signToken, verifyToken } from "./jwt";
import type { AuthenticatedAdmin, SessionPayload } from "@/types/auth";

/**
 * Write a signed JWT into the session cookie.
 * Call this after a successful login.
 */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);
}

/**
 * Read and verify the current session.
 *
 * Returns null if:
 *  - No cookie is present
 *  - The token is expired or tampered
 *
 * This is the primary way server components obtain the current user.
 *
 * @example
 * const session = await getSession();
 * if (!session) redirect("/login");
 */
export async function getSession(): Promise<AuthenticatedAdmin | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Destroy the session cookie.
 * Call this on logout. The JWT itself cannot be revoked (stateless),
 * but deleting the cookie effectively ends the session from the browser's
 * perspective. If revocation is required (e.g. compromised accounts),
 * add a server-side blocklist using Redis.
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
