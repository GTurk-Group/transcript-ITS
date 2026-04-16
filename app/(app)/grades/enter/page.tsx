/**
 * /grades/enter — Grade entry page.
 *
 * ADMIN+ only. Allows submitting a grade for a student/course/semester
 * combination. Shows a live GPA preview before submission.
 */

import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/db";
import { students, courses, semesters, programmes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GradeEntryForm } from "./_components/grade-entry-form";

export default async function GradeEntryPage() {
  await requirePermission("enter_grades");

  // Load all active semesters, courses, and students for the form selects
  const [allSemesters, allCourses, allStudents] = await Promise.all([
    db
      .select()
      .from(semesters)
      .orderBy(semesters.year, semesters.semester),

    db
      .select({
        id: courses.id,
        code: courses.code,
        title: courses.title,
        creditHours: courses.creditHours,
        isScoring: courses.isScoring,
      })
      .from(courses)
      .where(eq(courses.isActive, true))
      .orderBy(courses.code),

    db
      .select({
        id: students.id,
        indexNumber: students.indexNumber,
        firstName: students.firstName,
        lastName: students.lastName,
        programmeName: programmes.name,
      })
      .from(students)
      .innerJoin(programmes, eq(students.programmeId, programmes.id))
      .where(eq(students.status, "ACTIVE"))
      .orderBy(students.indexNumber),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Enter grade</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Submit a grade for a student. The quality points are computed
          automatically from the grade and credit hours.
        </p>
      </div>

      <GradeEntryForm
        semesters={allSemesters}
        courses={allCourses}
        students={allStudents}
      />
    </div>
  );
}
