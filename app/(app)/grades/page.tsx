/**
 * /grades — Grade management page (server component).
 */

import { requirePermission } from "@/lib/auth/rbac";
import { getStudents } from "@/actions/crud/students";
import { getSemesters } from "@/actions/crud/semesters";
import { getActiveCourses } from "@/actions/crud/courses";
import { GradesClient } from "./_components/grades-client";

export default async function GradesPage() {
  await requirePermission("view_grades");
  const [students, semesters, courses] = await Promise.all([
    getStudents(), getSemesters(), getActiveCourses(),
  ]);
  return <GradesClient students={students.map(s => ({ ...s, programmeName: s.programmeName ?? "" }))} semesters={semesters} courses={courses} />;
}
