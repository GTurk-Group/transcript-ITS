/**
 * /dashboard — Main admin dashboard.
 *
 * Fetches real stat counts in parallel.
 */

import { requireAuth } from "@/lib/auth/rbac";
import { db } from "@/db";
import { students, courses, programmes, semesters, grades, transcripts } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { DashboardClient } from "./_components/dashboard-client";

export default async function DashboardPage() {
  const session = await requireAuth();

  const [
    [{ studentCount }],
    [{ courseCount }],
    [{ programmeCount }],
    [{ semesterCount }],
    [{ gradeCount }],
    [{ transcriptCount }],
    [{ activeStudentCount }],
  ] = await Promise.all([
    db.select({ studentCount: count() }).from(students),
    db.select({ courseCount: count() }).from(courses),
    db.select({ programmeCount: count() }).from(programmes),
    db.select({ semesterCount: count() }).from(semesters),
    db.select({ gradeCount: count() }).from(grades),
    db.select({ transcriptCount: count() }).from(transcripts),
    db.select({ activeStudentCount: count() }).from(students).where(eq(students.status, "ACTIVE")),
  ]);

  return (
    <DashboardClient
      session={session}
      stats={{
        students: studentCount,
        activeStudents: activeStudentCount,
        courses: courseCount,
        programmes: programmeCount,
        semesters: semesterCount,
        grades: gradeCount,
        transcripts: transcriptCount,
      }}
    />
  );
}
