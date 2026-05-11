"use server";

/**
 * Student CRUD server actions — updated with dateOfBirth and gender fields.
 * Grade security contract: all computed values server-side only.
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { students, programmes } from "@/db/schema";
import { assertPermission } from "@/lib/auth/rbac";
import { logAuditEvent, extractRequestMeta } from "@/lib/audit";
import type { ActionState } from "@/types/auth";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const studentSchema = z.object({
  indexNumber: z.string().min(1).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  programmeId: z.string().uuid(),
  level: z.coerce.number().int().min(100).max(900),
  entryYear: z.coerce.number().int().min(1990).max(2099),
  graduationYear: z.coerce.number().int().min(1990).max(2099).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
});

const studentUpdateSchema = studentSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(["ACTIVE", "GRADUATED", "WITHDRAWN"]).optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert empty string from FormData to undefined */
function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  if (!v || typeof v !== "string" || v.trim() === "") return undefined;
  return v.trim();
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createStudentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  const session = await assertPermission("manage_students");

  const parsed = studentSchema.safeParse({
    indexNumber: str(formData, "indexNumber"),
    firstName: str(formData, "firstName"),
    lastName: str(formData, "lastName"),
    dateOfBirth: str(formData, "dateOfBirth"),
    gender: str(formData, "gender"),
    programmeId: str(formData, "programmeId"),
    level: str(formData, "level"),
    entryYear: str(formData, "entryYear"),
    graduationYear: str(formData, "graduationYear"),
    email: str(formData, "email"),
    phoneNumber: str(formData, "phoneNumber"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0].message };
  }

  const d = parsed.data;

  try {
    const [created] = await db
      .insert(students)
      .values({
        indexNumber: d.indexNumber,
        firstName: d.firstName,
        lastName: d.lastName,
        dateOfBirth: d.dateOfBirth ?? null,
        gender: d.gender ?? null,
        programmeId: d.programmeId,
        level: d.level,
        entryYear: d.entryYear,
        graduationYear: d.graduationYear ?? null,
        email: d.email ?? null,
        phoneNumber: d.phoneNumber ?? null,
        status: "ACTIVE",
      })
      .returning({ id: students.id });

    const headerStore = await headers();
    await logAuditEvent({
      adminId: session.adminId,
      action: "CREATE_STUDENT",
      entity: "students",
      entityId: created.id,
      after: d,
      ...extractRequestMeta(headerStore),
    });

    revalidatePath("/students");
    return { status: "success", data: { id: created.id } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return {
        status: "error",
        error: `Index number "${d.indexNumber}" is already registered.`,
      };
    }
    return {
      status: "error",
      error: "Failed to create student. Please try again.",
    };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateStudentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await assertPermission("manage_students");

  const parsed = studentUpdateSchema.safeParse({
    id: str(formData, "id"),
    indexNumber: str(formData, "indexNumber"),
    firstName: str(formData, "firstName"),
    lastName: str(formData, "lastName"),
    dateOfBirth: str(formData, "dateOfBirth"),
    gender: str(formData, "gender"),
    programmeId: str(formData, "programmeId"),
    level: str(formData, "level"),
    entryYear: str(formData, "entryYear"),
    graduationYear: str(formData, "graduationYear"),
    email: str(formData, "email"),
    phoneNumber: str(formData, "phoneNumber"),
    status: str(formData, "status"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0].message };
  }

  const { id, ...fields } = parsed.data;
  if (!id) return { status: "error", error: "Missing student ID." };

  const [existing] = await db
    .select()
    .from(students)
    .where(eq(students.id, id))
    .limit(1);
  if (!existing) return { status: "error", error: "Student not found." };

  try {
    const [updated] = await db
      .update(students)
      .set({
        ...(fields.indexNumber !== undefined && {
          indexNumber: fields.indexNumber,
        }),
        ...(fields.firstName !== undefined && { firstName: fields.firstName }),
        ...(fields.lastName !== undefined && { lastName: fields.lastName }),
        ...(fields.programmeId !== undefined && {
          programmeId: fields.programmeId,
        }),
        ...(fields.level !== undefined && { level: fields.level }),
        ...(fields.entryYear !== undefined && { entryYear: fields.entryYear }),
        ...(fields.status !== undefined && { status: fields.status }),
        dateOfBirth: fields.dateOfBirth ?? null,
        gender: fields.gender ?? null,
        graduationYear: fields.graduationYear ?? null,
        email: fields.email ?? null,
        phoneNumber: fields.phoneNumber ?? null,
      })
      .where(eq(students.id, id))
      .returning();

    const headerStore = await headers();
    await logAuditEvent({
      adminId: session.adminId,
      action: "UPDATE_STUDENT",
      entity: "students",
      entityId: id,
      before: existing,
      after: updated,
      ...extractRequestMeta(headerStore),
    });

    revalidatePath("/students");
    return { status: "success" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return {
        status: "error",
        error: `Index number is already taken by another student.`,
      };
    }
    return {
      status: "error",
      error: "Failed to update student. Please try again.",
    };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteStudentAction(id: string): Promise<ActionState> {
  const session = await assertPermission("manage_students");

  const [existing] = await db
    .select()
    .from(students)
    .where(eq(students.id, id))
    .limit(1);
  if (!existing) return { status: "error", error: "Student not found." };

  try {
    await db.delete(students).where(eq(students.id, id));

    const headerStore = await headers();
    await logAuditEvent({
      adminId: session.adminId,
      action: "DELETE_STUDENT",
      entity: "students",
      entityId: id,
      before: existing,
      ...extractRequestMeta(headerStore),
    });

    revalidatePath("/students");
    return { status: "success" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("foreign key") || msg.includes("constraint")) {
      return {
        status: "error",
        error:
          "Cannot delete — this student has grade records. Set their status to Withdrawn instead.",
      };
    }
    return { status: "error", error: "Failed to delete student." };
  }
}

// ─── Status update ────────────────────────────────────────────────────────────

export async function updateStudentStatusAction(
  id: string,
  status: "ACTIVE" | "GRADUATED" | "WITHDRAWN",
): Promise<ActionState> {
  const session = await assertPermission("manage_students");

  const [existing] = await db
    .select()
    .from(students)
    .where(eq(students.id, id))
    .limit(1);
  if (!existing) return { status: "error", error: "Student not found." };

  await db.update(students).set({ status }).where(eq(students.id, id));

  const headerStore = await headers();
  await logAuditEvent({
    adminId: session.adminId,
    action: "UPDATE_STUDENT",
    entity: "students",
    entityId: id,
    before: { status: existing.status },
    after: { status },
    ...extractRequestMeta(headerStore),
  });

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  return { status: "success" };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getStudents() {
  return db
    .select({
      id: students.id,
      indexNumber: students.indexNumber,
      firstName: students.firstName,
      lastName: students.lastName,
      dateOfBirth: students.dateOfBirth,
      gender: students.gender,
      programmeId: students.programmeId,
      programmeName: programmes.name,
      level: students.level,
      entryYear: students.entryYear,
      graduationYear: students.graduationYear,
      status: students.status,
      email: students.email,
      phoneNumber: students.phoneNumber,
      createdAt: students.createdAt,
    })
    .from(students)
    .leftJoin(programmes, eq(students.programmeId, programmes.id))
    .orderBy(desc(students.createdAt));
}

export async function getStudentById(id: string) {
  const [row] = await db
    .select({
      id: students.id,
      indexNumber: students.indexNumber,
      firstName: students.firstName,
      lastName: students.lastName,
      dateOfBirth: students.dateOfBirth,
      gender: students.gender,
      programmeId: students.programmeId,
      programmeName: programmes.name,
      programmeCode: programmes.code,
      level: students.level,
      entryYear: students.entryYear,
      graduationYear: students.graduationYear,
      status: students.status,
      email: students.email,
      phoneNumber: students.phoneNumber,
      createdAt: students.createdAt,
    })
    .from(students)
    .leftJoin(programmes, eq(students.programmeId, programmes.id))
    .where(eq(students.id, id))
    .limit(1);
  return row ?? null;
}
