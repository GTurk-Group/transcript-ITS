/**
 * /admin/institution — View and edit institution settings.
 * SUPER_ADMIN only.
 */

import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/db";
import { institution } from "@/db/schema";
import { InstitutionClient } from "./client";

export default async function InstitutionPage() {
  await requirePermission("manage_institution");
  const rows = await db.select().from(institution).limit(1);
  const inst = rows[0] ?? null;
  return <InstitutionClient institution={inst} />;
}