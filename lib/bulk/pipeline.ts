/**
 * Student bulk insert pipeline — batched for performance.
 *
 * Valid rows are inserted in batches of 100 using a single INSERT statement.
 * Only batches that fail due to constraint violations fall back to per-row
 * recovery to identify which specific rows caused the failure.
 *
 * Performance comparison:
 *   Sequential (old): 5,000 rows × ~2ms each = ~10 seconds
 *   Batched   (new):  50 batches × ~10ms each = ~500ms
 */

import { db } from "@/db";
import { students } from "@/db/schema";
import { dbErrorMessage, parseDbError } from "@/actions/utils";
import type {
  ValidStudentRow,
  RowFailure as StudentRowFailure,
  BulkUploadResult as StudentBulkResult,
} from "./types";

const BATCH_SIZE = 100;

// ─── Types ────────────────────────────────────────────────────────────────────

type BatchResult = {
  succeeded: number;
  failures: StudentRowFailure[];
};

// ─── Batch insert ─────────────────────────────────────────────────────────────

async function insertBatch(batch: ValidStudentRow[]): Promise<BatchResult> {
  try {
    await db.insert(students).values(
      batch.map((row) => ({
        indexNumber: row.indexNumber,
        firstName: row.firstName,
        lastName: row.lastName,
        dateOfBirth: row.dateOfBirth,
        gender: row.gender,
        programmeId: row.programmeId,
        level: row.level,
        entryYear: row.entryYear,
        graduationYear: row.graduationYear ?? null,
        email: row.email,
        phoneNumber: row.phoneNumber,
        status: "ACTIVE" as const,
      })),
    );
    return { succeeded: batch.length, failures: [] };
  } catch {
    // Batch failed — fall back to per-row inserts to identify the bad rows
    return insertBatchRowByRow(batch);
  }
}

async function insertBatchRowByRow(
  batch: ValidStudentRow[],
): Promise<BatchResult> {
  let succeeded = 0;
  const failures: StudentRowFailure[] = [];

  for (const row of batch) {
    try {
      await db.insert(students).values({
        indexNumber: row.indexNumber,
        firstName: row.firstName,
        lastName: row.lastName,
        dateOfBirth: row.dateOfBirth,
        gender: row.gender,
        programmeId: row.programmeId,
        level: row.level,
        entryYear: row.entryYear,
        graduationYear: row.graduationYear ?? null,
        email: row.email ?? null,
        phoneNumber: row.phoneNumber ?? null,
        status: "ACTIVE" as const,
      });
      succeeded++;
    } catch (err) {
      const message = dbErrorMessage(
        parseDbError(err),
        "students",
        "This student could not be imported.",
      );
      failures.push({
        rowNumber: row.rowNumber,
        status: "error",
        rawValues: {
          indexNumber: row.indexNumber,
          firstName: row.firstName,
          lastName: row.lastName,
        },
        errors: [message],
      });
    }
  }

  return { succeeded, failures };
}

// ─── Public pipeline ──────────────────────────────────────────────────────────

export async function runStudentBulkInsertPipeline(
  validRows: ValidStudentRow[],
  failedRows: StudentRowFailure[],
  totalDataRows: number,
): Promise<StudentBulkResult> {
  const startedAt = Date.now();
  const allFailures: StudentRowFailure[] = [...failedRows];
  let totalSucceeded = 0;

  // Split into batches
  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    const result = await insertBatch(batch);
    totalSucceeded += result.succeeded;
    allFailures.push(...result.failures);
  }

  return {
    totalRows: totalDataRows,
    successCount: totalSucceeded,
    failureCount: allFailures.length,
    failures: allFailures,
    durationMs: Date.now() - startedAt,
  };
}
