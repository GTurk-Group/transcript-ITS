/**
 * Request-scoped caching using React.cache.
 *
 * React.cache() deduplicates calls with the same arguments within a single
 * React render tree (one server request). Subsequent calls return the cached
 * promise — no extra DB roundtrips.
 *
 * This is NOT persistent caching — the cache is discarded after the request.
 * For persistent caching, use unstable_cache from next/cache.
 *
 * Usage:
 *   import { getCachedSession, getCachedTranscript } from "@/lib/cache";
 *   const session    = await getCachedSession();
 *   const transcript = await getCachedTranscript(studentId);
 */

import { cache } from "react";
import { getSession } from "@/lib/auth/session";
import { assembleTranscript } from "@/lib/transcript";

/**
 * Cached session lookup.
 * Calling this multiple times in one request (e.g. layout + page + middleware)
 * hits the DB only once.
 */
export const getCachedSession = cache(async () => {
  return getSession();
});

/**
 * Cached transcript assembly.
 * The transcript page calls assembleTranscript() once for generateMetadata
 * and again for the page body — this ensures only one set of 5 parallel
 * DB queries runs per request.
 */
export const getCachedTranscript = cache(async (studentId: string) => {
  return assembleTranscript(studentId);
});

/**
 * Cached dashboard stats.
 * All stat cards share one query result per request.
 */
export const getCachedDashboardStats = cache(async () => {
  const { db } = await import("@/db");
  const { sql } = await import("drizzle-orm");
  // const { students, courses, programmes, grades, transcripts, admins } = await import("@/db/schema");

  // Single query per table using conditional aggregation
  const [counts] = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM students  WHERE status = 'ACTIVE')     AS active_students,
      (SELECT COUNT(*)::int FROM students)                               AS total_students,
      (SELECT COUNT(*)::int FROM programmes WHERE is_active = true)      AS active_programmes,
      (SELECT COUNT(*)::int FROM courses    WHERE is_active = true)      AS active_courses,
      (SELECT COUNT(*)::int FROM grades     WHERE is_superseded = false) AS total_grades,
      (SELECT COUNT(*)::int FROM transcripts)                            AS total_transcripts,
      (SELECT COUNT(*)::int FROM admins     WHERE is_active = true)      AS active_admins
  `);

  return counts as {
    active_students: number;
    total_students: number;
    active_programmes: number;
    active_courses: number;
    total_grades: number;
    total_transcripts: number;
    active_admins: number;
  };
});
