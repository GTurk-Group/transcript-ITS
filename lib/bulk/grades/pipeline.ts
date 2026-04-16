/**
 * Grade bulk insert pipeline — batched for performance.
 *
 * Grade insertions are more sensitive than student inserts because each row
 * has server-computed values (gradePoint, creditHours, computedQualityPoints)
 * that must be correct. The batch strategy is the same: try 100 at a time,
 * fall back to per-row on constraint failure.
 */

import { db } from "@/db";
import { grades } from "@/db/schema";
import { parseDbError } from "@/lib/actions/utils";
import type { ValidGradeRow, GradeRowFailure, GradeBulkResult } from "./types";

const BATCH_SIZE = 100;

type BatchResult = {
  succeeded: number;
  failures: GradeRowFailure[];
};

async function insertBatch(batch: ValidGradeRow[]): Promise<BatchResult> {
  try {
    await db.insert(grades).values(
      batch.map((row) => ({
        studentId: row.studentId,
        courseId: row.courseId,
        semesterId: row.semesterId,
        grade: row.grade as "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "F",
        gradePoint: row.gradePoint.toFixed(2),
        creditHours: row.creditHours,
        computedQualityPoints: row.computedQualityPoints.toFixed(2),
        isSuperseded: false,
      })),
    );
    return { succeeded: batch.length, failures: [] };
  } catch {
    return insertBatchRowByRow(batch);
  }
}

async function insertBatchRowByRow(
  batch: ValidGradeRow[],
): Promise<BatchResult> {
  let succeeded = 0;
  const failures: GradeRowFailure[] = [];

  for (const row of batch) {
    try {
      await db.insert(grades).values({
        studentId: row.studentId,
        courseId: row.courseId,
        semesterId: row.semesterId,
        grade: row.grade as "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "F",
        gradePoint: row.gradePoint.toFixed(2),
        creditHours: row.creditHours,
        computedQualityPoints: row.computedQualityPoints.toFixed(2),
        isSuperseded: false,
      });
      succeeded++;
    } catch (err) {
      const { message } = parseDbError(err);
      failures.push({
        row: row.rowNumber,
        field: "grade",
        code: "DB_ERROR",
        message,
        raw: row,
      });
    }
  }

  return { succeeded, failures };
}

export async function runGradeBulkInsertPipeline(
  validRows: ValidGradeRow[],
): Promise<GradeBulkResult> {
  if (validRows.length === 0) {
    return { totalRows: 0, successCount: 0, failureCount: 0, failures: [] };
  }

  const allFailures: GradeRowFailure[] = [];
  let totalSucceeded = 0;

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    const result = await insertBatch(batch);
    totalSucceeded += result.succeeded;
    allFailures.push(...result.failures);
  }

  return {
    totalRows: validRows.length,
    successCount: totalSucceeded,
    failureCount: allFailures.length,
    failures: allFailures,
  };
}
