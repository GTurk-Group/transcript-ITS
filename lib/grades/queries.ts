/**
 * Grade row queries.
 *
 * These functions fetch individual grade rows — used by the transcript
 * template (per-course table) and the grade entry pages.
 *
 * They are NOT used for GPA computation. GPA uses SQL aggregation
 * via lib/gpa/queries.ts, which never fetches individual rows.
 *
 * Naming distinction:
 *   fetchStudentGradeRows  — individual rows (for display / transcript table)
 *   querySemesterAggregate / queryCGPAAggregatesBySemester — in lib/gpa/queries.ts
 */

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { grades, courses, semesters } from "@/db/schema";

// ─── Row shape ────────────────────────────────────────────────────────────────

/**
 * A single grade row with all fields needed for display.
 * Numeric columns (gradePoint, computedQualityPoints) remain as strings —
 * that is what PostgreSQL/Drizzle returns for numeric columns.
 * Format them with parseFloat().toFixed(2) at the UI layer.
 */
export type GradeDisplayRow = {
  id: string;
  studentId: string;
  courseId: string;
  semesterId: string;
  grade: string;
  /** PostgreSQL numeric → string. Use parseFloat() to format. */
  gradePoint: string;
  creditHours: number;
  /** Pre-computed at write time. Use parseFloat() to format. */
  computedQualityPoints: string;
  /** False means course does not count toward GPA — shown on transcript. */
  isScoring: boolean | null;
  courseCode: string;
  courseTitle: string;
  semesterYear: number;
  semesterTerm: "FIRST" | "SECOND";
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch all grade rows for a student across all semesters.
 *
 * Used by:
 *  - Transcript template (per-course table on the PDF)
 *  - Student results page (detailed course listing)
 *
 * Not used for GPA computation — use calculateCGPA() for that.
 *
 * Ordered: year ASC → semester ASC → course code ASC.
 */
export async function fetchStudentGradeRows(
  studentId: string,
): Promise<GradeDisplayRow[]> {
  const rows = await db
    .select({
      id: grades.id,
      studentId: grades.studentId,
      courseId: grades.courseId,
      semesterId: grades.semesterId,
      grade: grades.grade,
      gradePoint: grades.gradePoint,
      creditHours: grades.creditHours,
      computedQualityPoints: grades.computedQualityPoints,
      isScoring: courses.isScoring,
      courseCode: courses.code,
      courseTitle: courses.title,
      semesterYear: semesters.year,
      semesterTerm: semesters.semester,
    })
    .from(grades)
    .innerJoin(courses, eq(grades.courseId, courses.id))
    .innerJoin(semesters, eq(grades.semesterId, semesters.id))
    .where(eq(grades.studentId, studentId))
    .orderBy(semesters.year, semesters.semester, courses.code);

  return rows as GradeDisplayRow[];
}

/**
 * Fetch grade rows for a single semester.
 *
 * Used by the per-semester results page.
 * For the SGPA value, call calculateSemesterGPA() instead.
 */
export async function fetchSemesterGradeRows(
  studentId: string,
  semesterId: string,
): Promise<GradeDisplayRow[]> {
  const rows = await db
    .select({
      id: grades.id,
      studentId: grades.studentId,
      courseId: grades.courseId,
      semesterId: grades.semesterId,
      grade: grades.grade,
      gradePoint: grades.gradePoint,
      creditHours: grades.creditHours,
      computedQualityPoints: grades.computedQualityPoints,
      isScoring: courses.isScoring,
      courseCode: courses.code,
      courseTitle: courses.title,
      semesterYear: semesters.year,
      semesterTerm: semesters.semester,
    })
    .from(grades)
    .innerJoin(courses, eq(grades.courseId, courses.id))
    .innerJoin(semesters, eq(grades.semesterId, semesters.id))
    .where(
      and(eq(grades.studentId, studentId), eq(grades.semesterId, semesterId)),
    )
    .orderBy(courses.code);

  return rows as GradeDisplayRow[];
}
