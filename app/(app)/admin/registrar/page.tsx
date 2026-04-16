/**
 * /admin/registrar — Manage the registrar who signs transcripts.
 * SUPER_ADMIN only.
 */

import { requirePermission } from "@/lib/auth/rbac";
import { db }                from "@/db";
import { registrar }         from "@/db/schema";
import { RegistrarClient }   from "./client";

export default async function RegistrarPage() {
  await requirePermission("manage_registrar");
  const rows = await db.select().from(registrar).orderBy(registrar.createdAt);
  return <RegistrarClient records={rows} />;
}
