/**
 * lib/actions/utils.ts
 *
 * Shared utilities for all server actions.
 *
 * Exports:
 *   parseDbError   — extracts a clean message from a raw DB error
 *   dbErrorMessage — returns a user-facing error string for common DB errors
 *   withAction     — wraps an async action body with consistent error handling
 */

import type { ActionState } from "@/types/auth";

// ─── DB error parsing ─────────────────────────────────────────────────────────

type ParsedDbError = {
  code: string;
  message: string;
  detail?: string;
};

/**
 * Parses a raw postgres.js / Drizzle error into a structured object.
 * Falls back gracefully for non-DB errors.
 */
export function parseDbError(err: unknown): ParsedDbError {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    return {
      code: String(e.code ?? "UNKNOWN"),
      message: String(e.message ?? "An unexpected error occurred"),
      detail: e.detail ? String(e.detail) : undefined,
    };
  }
  return { code: "UNKNOWN", message: String(err) };
}

/**
 * Maps common Postgres error codes to user-facing messages.
 *
 * @param err        The raw error thrown by Drizzle / postgres-js
 * @param entityName Human-readable entity name for messages e.g. "student"
 */
export function dbErrorMessage(err: unknown, entityName = "record"): string {
  const { code, message } = parseDbError(err);

  // 23505 — unique_violation
  if (
    code === "23505" ||
    message.includes("unique") ||
    message.includes("duplicate")
  ) {
    return `A ${entityName} with those details already exists.`;
  }

  // 23503 — foreign_key_violation
  if (
    code === "23503" ||
    message.includes("foreign key") ||
    message.includes("violates")
  ) {
    return `Cannot delete this ${entityName} because other records depend on it.`;
  }

  // 23502 — not_null_violation
  if (
    code === "23502" ||
    message.includes("not-null") ||
    message.includes("null value")
  ) {
    return `A required field is missing for this ${entityName}.`;
  }

  // Connection issues
  if (message.includes("ECONNREFUSED") || message.includes("AggregateError")) {
    return "Cannot connect to the database. Check your connection and try again.";
  }

  return `Failed to save ${entityName}. Please try again.`;
}

// ─── Action wrapper ───────────────────────────────────────────────────────────

/**
 * Wraps an async server action body with consistent error handling.
 *
 * Usage:
 *   export async function createXAction(...): Promise<ActionState<...>> {
 *     return withAction(async () => {
 *       // your logic here — throw or return { status: "error" } to signal failure
 *       return { status: "success", data: { id } };
 *     }, "[createXAction]");
 *   }
 *
 * If the inner function throws, withAction returns a generic error ActionState
 * rather than letting the exception bubble up to the client.
 */
export async function withAction<T = unknown>(
  fn: () => Promise<ActionState<T>>,
  label?: string,
): Promise<ActionState<T>> {
  try {
    return await fn();
  } catch (err: unknown) {
    const msg = parseDbError(err).message;

    // Log to server console for debugging — never reaches the client
    console.error(
      `[withAction]${label ? " " + label : ""} unhandled error:`,
      msg,
    );

    return {
      status: "error",
      error: "An unexpected error occurred. Please try again.",
    } as ActionState<T>;
  }
}
