/**
 * /dashboard — Main admin dashboard.
 *
 * Fetches real stat counts in parallel.
 */

import { requireAuth } from "@/lib/auth/rbac";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { DashboardClient } from "./_components/dashboard-client";

export default async function DashboardPage() {
  const session = await requireAuth();

  const [stats] = await db.execute<{
    studentCount: number;
    activeStudentCount: number;
    courseCount: number;
    programmeCount: number;
    semesterCount: number;
    gradeCount: number;
    transcriptCount: number;
  }>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM students) AS "studentCount",
      (SELECT COUNT(*)::int FROM students WHERE status = 'ACTIVE') AS "activeStudentCount",
      (SELECT COUNT(*)::int FROM courses) AS "courseCount",
      (SELECT COUNT(*)::int FROM programmes) AS "programmeCount",
      (SELECT COUNT(*)::int FROM semesters) AS "semesterCount",
      (SELECT COUNT(*)::int FROM grades) AS "gradeCount",
      (SELECT COUNT(*)::int FROM transcripts) AS "transcriptCount"
  `);

  return (
    <DashboardClient
      session={session}
      stats={{
        students: stats.studentCount,
        activeStudents: stats.activeStudentCount,
        courses: stats.courseCount,
        programmes: stats.programmeCount,
        semesters: stats.semesterCount,
        grades: stats.gradeCount,
        transcripts: stats.transcriptCount,
      }}
    />
  );
}
