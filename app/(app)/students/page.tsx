/**
 * /students — filtered by the logged-in admin's campus.
 * SUPER_ADMIN sees all students (campusId = null).
 */
import { requireAuth } from "@/lib/auth/rbac";
import { getStudents } from "@/actions/crud/students";
import { getProgrammes } from "@/actions/crud/programmes";
import { getCampuses } from "@/actions/crud/campuses";
import { StudentsClient } from "./_components/students-client";

export default async function StudentsPage() {
  const session = await requireAuth();

  // Campus filter: SUPER_ADMIN sees all (null), others see their campus only
  const campusFilter = session.role === "SUPER_ADMIN" ? null : session.campusId;

  const [students, programmes, campuses] = await Promise.all([
    getStudents(campusFilter),
    getProgrammes(),
    getCampuses(),
  ]);

  return (
    <StudentsClient
      initial={students.map(s => ({ ...s, programmeName: s.programmeName ?? "" }))}
      programmes={programmes}
      campuses={campuses}
    />
  );
}