/**
 * lib/rate-limit.ts — DB-backed rate limiter.
 *
 * Uses the rate_limit_attempts table (added in migration 0002).
 * If the table doesn't exist yet (migration not run), all requests
 * are allowed through — it fails OPEN, never blocking legitimate logins.
 *
 * No Redis or external service required.
 */

import { db } from "@/db";
import { rateLimitAttempts } from "@/db/schema";
import { and, eq, gte, lt, count } from "drizzle-orm";

type Options = {
  max: number; // max attempts in the window
  windowMs: number; // window size in milliseconds
  ipAddress: string;
  endpoint: string;
  method: string;
};

type Result = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Check and record a rate limit attempt.
 * @param key     e.g. "login:ip:1.2.3.4"
 * @param options window size and max attempts
 */
export async function rateLimit(
  key: string,
  ipAddress: string,
  endpoint: string,
  method: string,
  options: Options,
): Promise<Result> {
  const { max, windowMs } = options;
  const windowStart = new Date(Date.now() - windowMs);

  const [{ total }] = await db
    .select({ total: count() })
    .from(rateLimitAttempts)
    .where(
      and(
        eq(rateLimitAttempts.key, key),
        gte(rateLimitAttempts.createdAt, windowStart),
      ),
    );
  const attempts = Number(total);

  if (attempts >= max) {
    // Find oldest attempt to calculate retry-after
    const [oldest] = await db
      .select({ createdAt: rateLimitAttempts.createdAt })
      .from(rateLimitAttempts)
      .where(
        and(
          eq(rateLimitAttempts.key, key),
          gte(rateLimitAttempts.createdAt, windowStart),
        ),
      )
      .orderBy(rateLimitAttempts.createdAt)
      .limit(1);

    const retryMs = oldest
      ? oldest.createdAt.getTime() + windowMs - Date.now()
      : windowMs;

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(Math.max(retryMs, 0) / 1000),
    };
  }

  // Record this attempt
  await db
    .insert(rateLimitAttempts)
    .values({ key, ipAddress, endpoint, method });
  return { allowed: true, remaining: max, retryAfterSeconds: 0 };
}

/**
 * Clear all attempts for a key (call after successful login).
 */
export async function clearRateLimit(key: string): Promise<void> {
  await db.delete(rateLimitAttempts).where(eq(rateLimitAttempts.key, key));
}

/**
 * Canonical key for login rate limiting.
 */
export function loginRateLimitKey(ip: string): string {
  return `login:ip:${ip}`;
}
