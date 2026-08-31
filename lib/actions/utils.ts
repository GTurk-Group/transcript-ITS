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
  type: string;
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
      type: String(e.code ?? "UNKNOWN"),
      message: String(e.message ?? "An unexpected error occurred"),
      detail: e.detail ? String(e.detail) : undefined,
    };
  }
  return { code: "UNKNOWN", type: "UNKNOWN", message: String(err) };
}

/**
 * Maps common Postgres error codes to user-facing messages with detailed context.
 *
 * @param err        The raw error thrown by Drizzle or PostgreSQL
 * @param entityName Human-readable entity name for messages e.g. "student"
 */
export function dbErrorMessage(err: unknown, entityName = "record"): string {
  const { code, message, detail } = parseDbError(err);

  // --- 23505: unique_violation ---
  if (code === "23505") {
    // Extract column and value from detail: e.g. 'Key (indexNumber)=(200002056) already exists.'
    const match = detail?.match(/Key \((.*?)\)=(.*?)(?=,|$)/);
    if (match) {
      const column = match[1];
      const value = match[2];
      return `Duplicate value for "${column}": ${value}. A ${entityName} with this value already exists.`;
    }
    return `A ${entityName} with those details already exists.`;
  }

  // --- 23503: foreign_key_violation ---
  if (code === "23503") {
    // Extract table/column from detail if possible
    const match = detail?.match(/Key \((.*?)\)=/);
    if (match) {
      return `Invalid reference: "${match[1]}" does not exist or is inactive.`;
    }
    return `Cannot save this ${entityName} because a related record is missing.`;
  }

  // --- 23502: not_null_violation ---
  if (code === "23502") {
    const match = detail?.match(/column "(.*?)"/);
    if (match) {
      return `Missing required field: "${match[1]}". Please provide a value.`;
    }
    return `A required field is missing for this ${entityName}.`;
  }

  // --- 22P02: invalid input syntax (date, number, etc.) ---
  if (code === "22P02") {
    return `Invalid data format: ${detail || "check date or number fields."}`;
  }

  // --- 23514: check constraint (e.g., level, gender) ---
  if (code === "23514") {
    return `Invalid value – ${detail || "please check level, gender, or other constraints."}`;
  }

  // --- Connection issues ---
  if (
    message.includes("ECONNREFUSED") ||
    message.includes("AggregateError") ||
    message.includes("connect")
  ) {
    return "Cannot connect to the database. Check your connection and try again.";
  }

  // Fallback: use the original error message (or a generic one)
  return message !== "An unexpected error occurred"
    ? message
    : `Failed to save ${entityName}. Please try again.`;
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
