"use server";

/**
 * actions/crud/campuses.ts
 * Campus management — SUPER_ADMIN only.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { campuses, admins, students } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { assertPermission } from "@/lib/auth/rbac";
import type { ActionState } from "@/types/auth";

export type Campus = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isActive: boolean | null;
  createdAt: Date;
};

const campusSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  code: z.string().min(1, "Code is required").max(50),
  address: z.string().optional(),
});

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getCampuses(): Promise<Campus[]> {
  return db.select().from(campuses).orderBy(campuses.name);
}

export async function getCampusById(id: string): Promise<Campus | null> {
  const [row] = await db
    .select()
    .from(campuses)
    .where(eq(campuses.id, id))
    .limit(1);
  return row ?? null;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createCampusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  await assertPermission("manage_institution");

  const parsed = campusSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    address: formData.get("address") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0].message };
  }

  try {
    const [created] = await db
      .insert(campuses)
      .values({
        name: parsed.data.name,
        code: parsed.data.code.toUpperCase(),
        address: parsed.data.address ?? null,
        isActive: true,
      })
      .returning({ id: campuses.id });

    revalidatePath("/admin/campuses");
    return { status: "success", data: { id: created.id } };
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return {
        status: "error",
        error: "A campus with that name or code already exists.",
      };
    }
    return {
      status: "error",
      error: "Failed to create campus. Please try again.",
    };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateCampusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertPermission("manage_institution");

  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", error: "Missing campus ID." };

  const parsed = campusSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    address: formData.get("address") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0].message };
  }

  await db
    .update(campuses)
    .set({
      name: parsed.data.name,
      code: parsed.data.code.toUpperCase(),
      address: parsed.data.address ?? null,
    })
    .where(eq(campuses.id, id));

  revalidatePath("/admin/campuses");
  return { status: "success" };
}

// ─── Toggle active ────────────────────────────────────────────────────────────

export async function toggleCampusActiveAction(
  id: string,
): Promise<ActionState> {
  await assertPermission("manage_institution");

  const [campus] = await db
    .select()
    .from(campuses)
    .where(eq(campuses.id, id))
    .limit(1);
  if (!campus) return { status: "error", error: "Campus not found." };

  await db
    .update(campuses)
    .set({ isActive: !campus.isActive })
    .where(eq(campuses.id, id));
  revalidatePath("/admin/campuses");
  return { status: "success" };
}

// ─── Assign admin to campus ───────────────────────────────────────────────────

export async function assignAdminCampusAction(
  adminId: string,
  campusId: string | null,
): Promise<ActionState> {
  await assertPermission("manage_users");

  await db.update(admins).set({ campusId }).where(eq(admins.id, adminId));

  revalidatePath("/admin/users");
  return { status: "success" };
}

// ─── Assign student to campus ────────────────────────────────────────────────

export async function assignStudentCampusAction(
  studentId: string,
  campusId: string,
): Promise<ActionState> {
  await assertPermission("manage_students");

  await db.update(students).set({ campusId }).where(eq(students.id, studentId));

  revalidatePath("/students");
  return { status: "success" };
}
