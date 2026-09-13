/**
 * lib/rate-limit.ts — DB-backed login rate limiter.
 *
 * Stores each attempt in rate_limit_attempts table.
 * Fails open (allows login) if the DB is unavailable or the table doesn't exist.
 */

import { db } from "@/db";
import { rateLimitAttempts } from "@/db/schema";
import { and, eq, gte, lt, count } from "drizzle-orm";

type Options = {
  max: number; // max attempts in window
  windowMs: number; // window in milliseconds
};

type Result = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export async function rateLimit(
  key: string,
  options: Options,
  ipAddress?: string,
): Promise<Result> {
  const { max, windowMs } = options;
  const windowStart = new Date(Date.now() - windowMs);

  try {
    // Count existing attempts in window
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

    // Record attempt. Keep insert schema-compatible with the DB table.
    await db.insert(rateLimitAttempts).values({
      key,
    });

    // Async cleanup of stale entries
    db.delete(rateLimitAttempts)
      .where(
        and(
          eq(rateLimitAttempts.key, key),
          lt(rateLimitAttempts.createdAt, windowStart),
        ),
      )
      .catch(() => {});

    return {
      allowed: true,
      remaining: max - attempts - 1,
      retryAfterSeconds: 0,
    };
  } catch {
    // Table missing or DB error — fail open so login still works
    return { allowed: true, remaining: max, retryAfterSeconds: 0 };
  }
}

export async function clearRateLimit(key: string): Promise<void> {
  try {
    await db.delete(rateLimitAttempts).where(eq(rateLimitAttempts.key, key));
  } catch {
    // Non-fatal
  }
}

export function loginRateLimitKey(ip: string): string {
  return `login:ip:${ip}`;
}
