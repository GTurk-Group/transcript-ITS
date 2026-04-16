/**
 * Shared server-action utilities.
 *
 * Three concerns live here:
 *
 * 1. parseDbError     — classify raw PostgreSQL errors into typed messages
 *                       so every action gives consistent, actionable feedback.
 *
 * 2. withAction       — thin wrapper that catches unexpected throws, logs them,
 *                       and always returns a well-typed ActionState.
 *
 * 3. requireRecord    — fetch-or-404 helper used by update/delete actions
 *                       to capture `before` state for audit logs.
 *
 * Nothing here is specific to any entity. Keep it that way.
 */

import type { ActionState } from "@/types/auth";

// ─── PostgreSQL error codes we handle explicitly ──────────────────────────────

const PG_UNIQUE_VIOLATION = "23505";
const PG_FK_VIOLATION = "23503";
const PG_NOT_NULL_VIOLATION = "23502";
const PG_CHECK_VIOLATION = "23514";

type ParsedDbError = {
  type: "unique" | "foreign_key" | "not_null" | "check" | "unknown";
  /** Column name extracted from the constraint detail, if available */
  column?: string;
};

/**
 * Classify a raw database error.
 *
 * pg/Drizzle surfaces PostgreSQL error codes via err.code.
 * We also fall back to string-matching the message for environments
 * where the code is not surfaced directly (e.g. some serverless adapters).
 */
export function parseDbError(err: unknown): ParsedDbError {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;

    const code = typeof e.code === "string" ? e.code : "";
    const detail = typeof e.detail === "string" ? e.detail : "";
    const msg = typeof e.message === "string" ? e.message : "";

    // Extract column name from pg detail: 'Key (column_name)=(value) already exists.'
    const columnMatch = detail.match(/Key \(([^)]+)\)/);
    const column = columnMatch?.[1];

    if (code === PG_UNIQUE_VIOLATION || msg.includes("unique"))
      return { type: "unique", column };
    if (code === PG_FK_VIOLATION || msg.includes("foreign key"))
      return { type: "foreign_key", column };
    if (code === PG_NOT_NULL_VIOLATION || msg.includes("not null"))
      return { type: "not_null", column };
    if (code === PG_CHECK_VIOLATION || msg.includes("check constraint"))
      return { type: "check", column };
  }

  return { type: "unknown" };
}

/**
 * Human-readable messages for each entity's unique columns.
 * Extend this when new entities are added.
 *
 * Key format: `entity:column`
 */
const UNIQUE_MESSAGES: Record<string, string> = {
  "programmes:name": "A programme with this name already exists.",
  "programmes:code": "A programme with this code already exists.",
  "students:index_number": "A student with this index number already exists.",
  "courses:code": "A course with this code already exists.",
  "semesters:year_semester": "This semester already exists for the given year.",
  "grades:student_course_semester":
    "A grade for this student, course, and semester already exists.",
};

/**
 * Produce a user-facing error string from a parsed DB error.
 *
 * `entity` should match the table name used as key prefix above.
 */
export function dbErrorMessage(
  err: ParsedDbError,
  entity: string,
  fallback = "An unexpected database error occurred.",
): string {
  if (err.type === "unique") {
    const key = `${entity}:${err.column ?? ""}`;
    return (
      UNIQUE_MESSAGES[key] ?? `A record with these details already exists.`
    );
  }
  if (err.type === "foreign_key") {
    return "This record references another record that does not exist.";
  }
  if (err.type === "not_null") {
    return `A required field is missing: ${err.column ?? "unknown"}.`;
  }
  return fallback;
}

// ─── Action wrapper ───────────────────────────────────────────────────────────

/**
 * Wrap an async action body so unhandled throws always resolve
 * to ActionState<T> rather than crashing the server action.
 *
 * Usage:
 *   return withAction(async () => {
 *     // ... your action body
 *     return { status: "success" };
 *   }, "[createProgrammeAction]");
 */
export async function withAction<T>(
  fn: () => Promise<ActionState<T>>,
  label: string,
): Promise<ActionState<T>> {
  try {
    return await fn();
  } catch (err) {
    console.error(`${label} unhandled error:`, err);
    return {
      status: "error",
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

// ─── Null-safe coercion helpers ───────────────────────────────────────────────

/** Read a FormData field as a trimmed string, returning null if empty. */
export function getString(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Read a FormData field as a boolean checkbox value. */
export function getBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "true" || formData.get(key) === "on";
}
