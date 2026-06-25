/**
 * Audit logging utility.
 *
 * Design principles:
 *  - Failures are logged to stderr but never propagate to the caller.
 *    A broken audit write should not fail a login or a grade submission.
 *  - The `before` and `after` fields capture a full diff, not just IDs.
 *  - All state-changing server actions should call logAuditEvent.
 */

import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export type AuditAction =
  // Auth
  | "LOGIN"
  | "LOGOUT"
  // Programmes
  | "CREATE_PROGRAMME"
  | "UPDATE_PROGRAMME"
  | "DELETE_PROGRAMME"
  // Students
  | "CREATE_STUDENT"
  | "UPDATE_STUDENT"
  | "DELETE_STUDENT"
  // Courses
  | "CREATE_COURSE"
  | "UPDATE_COURSE"
  | "DELETE_COURSE"
  // Semesters
  | "CREATE_SEMESTER"
  | "UPDATE_SEMESTER"
  | "DELETE_SEMESTER"
  // Grades
  | "CREATE_GRADE"
  | "UPDATE_GRADE"
  | "SUPERSEDE_GRADE"
  | "DELETE_GRADE"
  // Transcripts
  | "GENERATE_TRANSCRIPT"
  | "DELETE_TRANSCRIPT"
  | "RECORD_TRANSCRIPT"
  // Bulk
  | "BULK_UPLOAD_STARTED"
  | "BULK_UPLOAD_COMPLETED"
  // Admin
  | "CREATE_ADMIN"
  | "UPDATE_ADMIN"
  | "DISABLE_ADMIN"
  | "UPDATE_INSTITUTION";

type AuditEventInput = {
  adminId: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Write an audit log entry.
 *
 * Intentionally swallows errors — audit log failures should never block
 * the primary operation. Monitor stderr for persistent write failures.
 */
export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      adminId: input.adminId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write audit event:", {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Extract standard request metadata from Next.js headers.
 */
export function extractRequestMeta(
  headerStore: Headers,
): Pick<AuditEventInput, "ipAddress" | "userAgent"> {
  return {
    ipAddress:
      headerStore.get("x-forwarded-for") ??
      headerStore.get("x-real-ip") ??
      null,
    userAgent: headerStore.get("user-agent") ?? null,
  };
}
