"use server";

/**
 * Programmes CRUD server actions.
 *
 * Permissions: manage_programmes (ADMIN+)
 * All mutations write an audit log entry.
 */

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { programmes } from "@/db/schema";
import { assertPermission } from "@/lib/auth/rbac";
import { logAuditEvent, extractRequestMeta } from "@/lib/audit";
import { parseDbError, dbErrorMessage, withAction } from "@/lib/actions/utils";
import type { ActionState } from "@/types/auth";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const programmeSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must be at most 255 characters"),
  code: z
    .string({ required_error: "Code is required" })
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code must be at most 50 characters")
    .toUpperCase(),
});

const idSchema = z.string().uuid("Invalid programme ID");

// ─── Types ────────────────────────────────────────────────────────────────────

export type Programme = typeof programmes.$inferSelect;

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createProgrammeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  return withAction(async () => {
    const session = await assertPermission("manage_programmes");

    const parsed = programmeSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
    });

    if (!parsed.success) {
      return {
        status: "error",
        error: "Please correct the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    let record: Programme;
    try {
      [record] = await db.insert(programmes).values(parsed.data).returning();
    } catch (err) {
      const e = parseDbError(err);
      return { status: "error", error: dbErrorMessage(e, "programmes") };
    }

    const meta = extractRequestMeta(await headers());
    await logAuditEvent({
      adminId: session.adminId,
      action: "CREATE_PROGRAMME",
      entity: "programmes",
      entityId: record.id,
      after: record as Record<string, unknown>,
      ...meta,
    });

    revalidatePath("/programmes");
    return { status: "success", data: { id: record.id } };
  }, "[createProgrammeAction]");
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateProgrammeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withAction(async () => {
    const session = await assertPermission("manage_programmes");

    const idResult = idSchema.safeParse(formData.get("id"));
    if (!idResult.success)
      return { status: "error", error: "Invalid programme ID." };

    const parsed = programmeSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
    });

    if (!parsed.success) {
      return {
        status: "error",
        error: "Please correct the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    // Capture before state for audit diff
    const existing = await db
      .select()
      .from(programmes)
      .where(eq(programmes.id, idResult.data))
      .limit(1);
    if (existing.length === 0)
      return { status: "error", error: "Programme not found." };

    let updated: Programme;
    try {
      [updated] = await db
        .update(programmes)
        .set(parsed.data)
        .where(eq(programmes.id, idResult.data))
        .returning();
    } catch (err) {
      const e = parseDbError(err);
      return { status: "error", error: dbErrorMessage(e, "programmes") };
    }

    const meta = extractRequestMeta(await headers());
    await logAuditEvent({
      adminId: session.adminId,
      action: "UPDATE_PROGRAMME",
      entity: "programmes",
      entityId: updated.id,
      before: existing[0] as Record<string, unknown>,
      after: updated as Record<string, unknown>,
      ...meta,
    });

    revalidatePath("/programmes");
    revalidatePath(`/programmes/${updated.id}`);
    return { status: "success" };
  }, "[updateProgrammeAction]");
}

// ─── TOGGLE ACTIVE ────────────────────────────────────────────────────────────

export async function toggleProgrammeActiveAction(
  id: string,
): Promise<ActionState> {
  return withAction(async () => {
    const session = await assertPermission("manage_programmes");

    const existing = await db
      .select()
      .from(programmes)
      .where(eq(programmes.id, id))
      .limit(1);
    if (existing.length === 0)
      return { status: "error", error: "Programme not found." };

    const [updated] = await db
      .update(programmes)
      .set({ isActive: !existing[0].isActive })
      .where(eq(programmes.id, id))
      .returning();

    const meta = extractRequestMeta(await headers());
    await logAuditEvent({
      adminId: session.adminId,
      action: "UPDATE_PROGRAMME",
      entity: "programmes",
      entityId: id,
      before: existing[0] as Record<string, unknown>,
      after: updated as Record<string, unknown>,
      ...meta,
    });

    revalidatePath("/programmes");
    return { status: "success" };
  }, "[toggleProgrammeActiveAction]");
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteProgrammeAction(id: string): Promise<ActionState> {
  return withAction(async () => {
    const session = await assertPermission("manage_programmes");

    const existing = await db
      .select()
      .from(programmes)
      .where(eq(programmes.id, id))
      .limit(1);
    if (existing.length === 0)
      return { status: "error", error: "Programme not found." };

    try {
      await db.delete(programmes).where(eq(programmes.id, id));
    } catch (err) {
      const e = parseDbError(err);
      if (e.type === "foreign_key") {
        return {
          status: "error",
          error:
            "Cannot delete this programme — students are enrolled in it. Deactivate it instead.",
        };
      }
      return { status: "error", error: dbErrorMessage(e, "programmes") };
    }

    const meta = extractRequestMeta(await headers());
    await logAuditEvent({
      adminId: session.adminId,
      action: "DELETE_PROGRAMME",
      entity: "programmes",
      entityId: id,
      before: existing[0] as Record<string, unknown>,
      ...meta,
    });

    revalidatePath("/programmes");
    return { status: "success" };
  }, "[deleteProgrammeAction]");
}

// ─── READ HELPERS (used by pages, not mutations) ──────────────────────────────

export async function getProgrammes() {
  return db.select().from(programmes).orderBy(programmes.name);
}

export async function getProgrammeById(id: string): Promise<Programme | null> {
  const rows = await db
    .select()
    .from(programmes)
    .where(eq(programmes.id, id))
    .limit(1);
  return rows[0] ?? null;
}
