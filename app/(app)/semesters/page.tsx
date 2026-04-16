/**
 * /semesters — Semester management page (server).
 */

import { requirePermission } from "@/lib/auth/rbac";
import { getSemesters }      from "@/actions/crud/semesters";
import { SemestersClient }   from "./_components/semesters-client";

export default async function SemestersPage() {
  await requirePermission("manage_courses");
  const semesters = await getSemesters();
  return <SemestersClient initial={semesters} />;
}
