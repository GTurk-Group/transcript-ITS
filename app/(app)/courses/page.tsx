/**
 * /courses — Course management page (server component).
 */

import { requirePermission } from "@/lib/auth/rbac";
import { getCourses } from "@/actions/crud/courses";
import { CoursesClient } from "./_components/courses-client";

export default async function CoursesPage() {
  await requirePermission("manage_courses");
  const courses = await getCourses();
  return <CoursesClient initial={courses} />;
}
