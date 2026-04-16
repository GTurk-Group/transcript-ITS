"use server";

/**
 * Semesters CRUD server actions.
 *
 * Permissions: manage_courses (ADMIN+) — semesters are an academic calendar
 * concern that shares the same permission as courses.
 *
 * The (year, semester) pair is UNIQUE in the database.
 * Deleting a semester that has grade records is blocked — the grades
 * would become orphaned and GPA queries would return wrong results.
 */

import { z } from "zod";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { semesters, grades } from "@/db/schema";
import { assertPermission } from "@/lib/auth/rbac";
import { logAuditEvent, extractRequestMeta } from "@/lib/audit";
import { parseDbError, dbErrorMessage, withAction } from "@/lib/actions/utils";
import type { ActionState } from "@/types/auth";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const semesterSchema = z.object({
  year: z.coerce
    .number({ invalid_type_error: "Year must be a number" })
    .int("Year must be a whole number")
    .min(1990, "Year seems too early")
    .max(new Date().getFullYear() + 2, "Year is too far in the future"),
  semester: z.enum(["FIRST", "SECOND"], {
    errorMap: () => ({ message: "Semester must be FIRST or SECOND" }),
  }),
});

const semesterUpdateSchema = semesterSchema.partial().extend({
  id: z.string().uuid("Invalid semester ID"),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Semester = typeof semesters.$inferSelect;

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createSemesterAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  return withAction(async () => {
    const session = await assertPermission("manage_courses");

    const parsed = semesterSchema.safeParse({
      year: formData.get("year"),
      semester: formData.get("semester"),
    });

    if (!parsed.success) {
      return {
        status: "error",
        error: "Please correct the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    let record: Semester;
    try {
      [record] = await db.insert(semesters).values(parsed.data).returning();
    } catch (err) {
      const e = parseDbError(err);
      if (e.type === "unique") {
        return {
          status: "error",
          error: `The ${parsed.data.semester === "FIRST" ? "First" : "Second"} Semester of ${parsed.data.year} already exists.`,
          fieldErrors: { semester: ["Duplicate semester"] },
        };
      }
      return { status: "error", error: dbErrorMessage(e, "semesters") };
    }

    const meta = extractRequestMeta(await headers());
    await logAuditEvent({
      adminId: session.adminId,
      action: "CREATE_SEMESTER",
      entity: "semesters",
      entityId: record.id,
      after: record as Record<string, unknown>,
      ...meta,
    });

    revalidatePath("/semesters");
    return { status: "success", data: { id: record.id } };
  }, "[createSemesterAction]");
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * Update a semester's year or term.
 *
 * This is intentionally restrictive — changing a semester's year/term after
 * grades have been entered against it would silently move those grades to a
 * different academic period. The action warns about this and proceeds only
 * when the admin explicitly confirms (confirmed flag in formData).
 */
export async function updateSemesterAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withAction(async () => {
    const session = await assertPermission("manage_courses");

    const parsed = semesterUpdateSchema.safeParse({
      id: formData.get("id"),
      year: formData.get("year"),
      semester: formData.get("semester"),
    });

    if (!parsed.success) {
      return {
        status: "error",
        error: "Please correct the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { id, ...fields } = parsed.data;

    const existing = await db
      .select()
      .from(semesters)
      .where(eq(semesters.id, id))
      .limit(1);
    if (existing.length === 0)
      return { status: "error", error: "Semester not found." };

    // Warn if grades exist and values are actually changing
    const yearChanging =
      fields.year !== undefined && fields.year !== existing[0].year;
    const semesterChanging =
      fields.semester !== undefined && fields.semester !== existing[0].semester;

    if (yearChanging || semesterChanging) {
      const hasGrades = await db
        .select({ id: grades.id })
        .from(grades)
        .where(eq(grades.semesterId, id))
        .limit(1);
      if (hasGrades.length > 0 && formData.get("confirmed") !== "true") {
        return {
          status: "error",
          error:
            "This semester has grade records. Changing the year or term will move those grades to a different academic period. Submit again with confirmed=true to proceed.",
        };
      }
    }

    // Uniqueness check: the new (year, semester) pair must not already exist
    if (fields.year !== undefined || fields.semester !== undefined) {
      const newYear = fields.year ?? existing[0].year;
      const newSemester = fields.semester ?? existing[0].semester;
      const conflict = await db
        .select({ id: semesters.id })
        .from(semesters)
        .where(
          and(
            eq(semesters.year, newYear),
            eq(semesters.semester, newSemester),
            ne(semesters.id, id),
          ),
        )
        .limit(1);

      if (conflict.length > 0) {
        return {
          status: "error",
          error: `The ${newSemester === "FIRST" ? "First" : "Second"} Semester of ${newYear} already exists.`,
          fieldErrors: { semester: ["Duplicate semester"] },
        };
      }
    }

    let updated: Semester;
    try {
      [updated] = await db
        .update(semesters)
        .set(fields)
        .where(eq(semesters.id, id))
        .returning();
    } catch (err) {
      return {
        status: "error",
        error: dbErrorMessage(parseDbError(err), "semesters"),
      };
    }

    const meta = extractRequestMeta(await headers());
    await logAuditEvent({
      adminId: session.adminId,
      action: "UPDATE_SEMESTER",
      entity: "semesters",
      entityId: id,
      before: existing[0] as Record<string, unknown>,
      after: updated as Record<string, unknown>,
      ...meta,
    });

    revalidatePath("/semesters");
    return { status: "success" };
  }, "[updateSemesterAction]");
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteSemesterAction(id: string): Promise<ActionState> {
  return withAction(async () => {
    const session = await assertPermission("manage_courses");

    const existing = await db
      .select()
      .from(semesters)
      .where(eq(semesters.id, id))
      .limit(1);
    if (existing.length === 0)
      return { status: "error", error: "Semester not found." };

    const hasGrades = await db
      .select({ id: grades.id })
      .from(grades)
      .where(eq(grades.semesterId, id))
      .limit(1);
    if (hasGrades.length > 0) {
      return {
        status: "error",
        error:
          "Cannot delete this semester — it has grade records. Remove the grades first.",
      };
    }

    try {
      await db.delete(semesters).where(eq(semesters.id, id));
    } catch (err) {
      const e = parseDbError(err);
      if (e.type === "foreign_key")
        return {
          status: "error",
          error:
            "Cannot delete this semester — it is referenced by other records.",
        };
      return { status: "error", error: dbErrorMessage(e, "semesters") };
    }

    const meta = extractRequestMeta(await headers());
    await logAuditEvent({
      adminId: session.adminId,
      action: "DELETE_SEMESTER",
      entity: "semesters",
      entityId: id,
      before: existing[0] as Record<string, unknown>,
      ...meta,
    });

    revalidatePath("/semesters");
    return { status: "success" };
  }, "[deleteSemesterAction]");
}

// ─── READ HELPERS ─────────────────────────────────────────────────────────────

export async function getSemesters() {
  return db
    .select()
    .from(semesters)
    .orderBy(semesters.year, semesters.semester);
}

export async function getSemesterById(id: string): Promise<Semester | null> {
  const rows = await db
    .select()
    .from(semesters)
    .where(eq(semesters.id, id))
    .limit(1);
  return rows[0] ?? null;
}
