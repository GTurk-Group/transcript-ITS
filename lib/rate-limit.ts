/**
 * DB-backed rate limiter — no Redis or external service required.
 *
 * Stores attempt timestamps in the `rate_limit_attempts` table.
 * Works in both development and production with no additional infrastructure.
 *
 * For very high traffic (10k+ req/s), swap to Upstash Redis:
 *   pnpm add @upstash/ratelimit @upstash/redis
 *
 * Usage:
 *   const result = await rateLimit("login:ip:1.2.3.4", { max: 5, windowMs: 15 * 60 * 1000 });
 *   if (!result.allowed) return { error: `Too many attempts. Retry in ${result.retryAfterSeconds}s` };
 */

import { db } from "@/db";
import { rateLimitAttempts } from "@/db/schema";
import { and, eq, gte, lt, count } from "drizzle-orm";

type RateLimitOptions = {
  /** Maximum number of attempts allowed in the window. */
  max: number;
  /** Window size in milliseconds. */
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  totalAttempts: number;
};

/**
 * Check and record a rate limit attempt.
 *
 * @param key       Unique key for this action + identifier (e.g. "login:1.2.3.4")
 * @param options   Window and max attempts
 */
export async function rateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const { max, windowMs } = options;
  const windowStart = new Date(Date.now() - windowMs);

  // Count existing attempts in the window
  const [{ total }] = await db
    .select({ total: count() })
    .from(rateLimitAttempts)
    .where(
      and(
        eq(rateLimitAttempts.key, key),
        gte(rateLimitAttempts.createdAt, windowStart),
      ),
    );

  const totalAttempts = Number(total);

  if (totalAttempts >= max) {
    // Find the oldest attempt in the window to calculate retry-after
    const oldest = await db
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

    const retryAfterMs = oldest[0]
      ? oldest[0].createdAt.getTime() + windowMs - Date.now()
      : windowMs;

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(Math.max(retryAfterMs, 0) / 1000),
      totalAttempts,
    };
  }

  // Record this attempt
  await db.insert(rateLimitAttempts).values({ key });

  // Async cleanup — purge old entries older than the window (fire and forget)
  cleanupOldEntries(key, windowStart).catch(() => {});

  return {
    allowed: true,
    remaining: max - totalAttempts - 1,
    retryAfterSeconds: 0,
    totalAttempts: totalAttempts + 1,
  };
}

/**
 * Clear all attempts for a key (call after successful login to reset the counter).
 */
export async function clearRateLimit(key: string): Promise<void> {
  await db.delete(rateLimitAttempts).where(eq(rateLimitAttempts.key, key));
}

/**
 * Build a canonical key for login rate limiting.
 */
export function loginRateLimitKey(ip: string): string {
  return `login:ip:${ip}`;
}

// ─── Internals ────────────────────────────────────────────────────────────────

async function cleanupOldEntries(
  key: string,
  windowStart: Date,
): Promise<void> {
  await db
    .delete(rateLimitAttempts)
    .where(
      and(
        eq(rateLimitAttempts.key, key),
        lt(rateLimitAttempts.createdAt, windowStart),
      ),
    );
}
