/**
 * /grades — filtered by campus.
 */
import { requireAuth } from "@/lib/auth/rbac";
import { getStudents } from "@/actions/crud/students";
import { getSemesters } from "@/actions/crud/semesters";
import { getActiveCourses } from "@/actions/crud/courses";
import { GradesClient } from "./_components/grades-client";

export default async function GradesPage() {
  const session = await requireAuth();
  const campusFilter = session.role === "SUPER_ADMIN" ? null : session.campusId;

  const [students, semesters, courses] = await Promise.all([
    getStudents(campusFilter),
    getSemesters(),
    getActiveCourses(),
  ]);

  return (
    <GradesClient
      students={students.map(s => ({ ...s, programmeName: s.programmeName ?? "" }))}
      semesters={semesters}
      courses={courses}
    />
  );
}