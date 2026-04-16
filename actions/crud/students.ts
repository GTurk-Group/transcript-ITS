"use server";

/**
 * Student CRUD server actions — updated with dateOfBirth and gender fields.
 * Grade security contract: all computed values server-side only.
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { eq, like, or, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { students, programmes } from "@/db/schema";
import { assertPermission } from "@/lib/auth/rbac";
import { logAuditEvent, extractRequestMeta } from "@/lib/audit";
import { withAction, parseDbError } from "@/lib/actions/utils";
import type { ActionState } from "@/types/auth";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const studentCreateSchema = z.object({
  indexNumber: z.string().min(1).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().optional().nullable(), // ISO date string YYYY-MM-DD
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  programmeId: z.string().uuid(),
  level: z.coerce.number().int().min(100).max(900),
  entryYear: z.coerce.number().int().min(1990).max(2099),
  graduationYear: z.coerce
    .number()
    .int()
    .min(1990)
    .max(2099)
    .optional()
    .nullable(),
  email: z.string().email().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
});

const studentUpdateSchema = studentCreateSchema
  .partial()
  .extend({ id: z.string().uuid() });

export type Student = typeof students.$inferSelect & { programmeName?: string };

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createStudentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  return withAction(async () => {
    const session = await assertPermission("manage_students");

    const parsed = studentCreateSchema.safeParse({
      indexNumber: formData.get("indexNumber"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      dateOfBirth: formData.get("dateOfBirth") || null,
      gender: formData.get("gender") || null,
      programmeId: formData.get("programmeId"),
      level: formData.get("level"),
      entryYear: formData.get("entryYear"),
      graduationYear: formData.get("graduationYear") || null,
      email: formData.get("email") || null,
      phoneNumber: formData.get("phoneNumber") || null,
    });

    if (!parsed.success) {
      return {
        status: "error" as const,
        error: "Validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const d = parsed.data;
    const [created] = await db
      .insert(students)
      .values({
        ...d,
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
    return { status: "success" as const, data: { id: created.id } };
  }, "[createStudentAction]");
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateStudentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withAction(async () => {
    const session = await assertPermission("manage_students");

    const parsed = studentUpdateSchema.safeParse({
      id: formData.get("id"),
      indexNumber: formData.get("indexNumber"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      dateOfBirth: formData.get("dateOfBirth") || null,
      gender: formData.get("gender") || null,
      programmeId: formData.get("programmeId"),
      level: formData.get("level"),
      entryYear: formData.get("entryYear"),
      graduationYear: formData.get("graduationYear") || null,
      email: formData.get("email") || null,
      phoneNumber: formData.get("phoneNumber") || null,
    });

    if (!parsed.success) {
      return {
        status: "error" as const,
        error: "Validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { id, ...updates } = parsed.data;
    const existing = await db
      .select()
      .from(students)
      .where(eq(students.id, id!))
      .limit(1);
    if (!existing[0])
      return { status: "error" as const, error: "Student not found." };

    const [updated] = await db
      .update(students)
      .set(updates)
      .where(eq(students.id, id!))
      .returning();

    const headerStore = await headers();
    await logAuditEvent({
      adminId: session.adminId,
      action: "UPDATE_STUDENT",
      entity: "students",
      entityId: id!,
      before: existing[0],
      after: updated,
      ...extractRequestMeta(headerStore),
    });

    revalidatePath("/students");
    return { status: "success" as const };
  }, "[updateStudentAction]");
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteStudentAction(id: string): Promise<ActionState> {
  return withAction(async () => {
    const session = await assertPermission("manage_students");
    const [existing] = await db
      .select()
      .from(students)
      .where(eq(students.id, id))
      .limit(1);
    if (!existing)
      return { status: "error" as const, error: "Student not found." };

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
    return { status: "success" as const };
  }, "[deleteStudentAction]");
}

// ─── Status ───────────────────────────────────────────────────────────────────

export async function updateStudentStatusAction(
  id: string,
  status: "ACTIVE" | "GRADUATED" | "WITHDRAWN",
): Promise<ActionState> {
  return withAction(async () => {
    const session = await assertPermission("manage_students");
    const [existing] = await db
      .select()
      .from(students)
      .where(eq(students.id, id))
      .limit(1);
    if (!existing)
      return { status: "error" as const, error: "Student not found." };

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
    return { status: "success" as const };
  }, "[updateStudentStatusAction]");
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
      status: students.status,
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
