/**
 * /students — Student list page (server component).
 */

import { requirePermission }  from "@/lib/auth/rbac";
import { getStudents }        from "@/actions/crud/students";
import { getProgrammes }      from "@/actions/crud/programmes";
import { StudentsClient }     from "./_components/students-client";

export default async function StudentsPage() {
  await requirePermission("manage_students");
  const [students, programmes] = await Promise.all([getStudents(), getProgrammes()]);
  return <StudentsClient initial={students} programmes={programmes} />;
}
