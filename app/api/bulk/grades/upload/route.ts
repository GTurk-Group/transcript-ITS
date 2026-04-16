/**
 * POST /api/bulk/grades/upload
 *
 * Accepts a multipart CSV upload, runs the full grade import pipeline,
 * and returns a GradeBulkResult JSON object.
 *
 * ─── Why an API route, not a server action?
 *
 * Multipart file uploads exceed what server actions handle cleanly.
 * The response is structured JSON that the client uses to render
 * the result UI — not a revalidation trigger.
 *
 * ─── Security
 *
 * gradePoint, creditHours, and computedQualityPoints are computed
 * entirely server-side in the validator. The CSV never contains them.
 * Any client attempting to inject these values will find they are
 * ignored — the pipeline reads only indexNumber, courseCode, semester,
 * year, and grade from the file.
 *
 * ─── Limits
 *   Max file size: 5 MB
 *   Max rows:      5,000
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";
import { can } from "@/lib/auth/rbac";
import { logAuditEvent, extractRequestMeta } from "@/lib/audit";
import { parseGradeCSV } from "@/lib/bulk/grades/parser";
import { validateGradeBatch } from "@/lib/bulk/grades/validator";
import { runGradeBulkInsertPipeline } from "@/lib/bulk/grades/pipeline";
import type { GradeBulkResult } from "@/lib/bulk/grades/types";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROW_COUNT = 5_000;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Auth ────────────────────────────────────────────────────────────────

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session, "bulk_upload"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // ── 2. Parse multipart body ────────────────────────────────────────────────

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid request — expected multipart/form-data." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'No file provided. Include a CSV as the "file" field.' },
      { status: 400 },
    );
  }

  // ── 3. Guards ──────────────────────────────────────────────────────────────

  const isCSV =
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "text/plain" ||
    file.name.toLowerCase().endsWith(".csv");

  if (!isCSV) {
    return NextResponse.json(
      {
        error: `Invalid file type "${file.type}". Only CSV files are accepted.`,
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`,
      },
      { status: 400 },
    );
  }

  // ── 4. Read and strip comments ─────────────────────────────────────────────

  let text: string;
  try {
    text = await file.text();
  } catch {
    return NextResponse.json(
      { error: "Failed to read the file. Ensure it is a valid UTF-8 CSV." },
      { status: 400 },
    );
  }

  if (text.trim().length === 0) {
    return NextResponse.json(
      { error: "The uploaded file is empty." },
      { status: 400 },
    );
  }

  const stripped = text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");

  // ── 5. Parse CSV ───────────────────────────────────────────────────────────

  const {
    rows: rawRows,
    missingHeaders,
    totalDataRows,
  } = parseGradeCSV(stripped);

  if (missingHeaders.length > 0) {
    return NextResponse.json(
      {
        error:
          `Missing required columns: ${missingHeaders.join(", ")}. ` +
          `Download the template to see the expected format.`,
      },
      { status: 400 },
    );
  }

  if (totalDataRows === 0) {
    return NextResponse.json(
      { error: "No data rows found in the file." },
      { status: 400 },
    );
  }

  if (totalDataRows > MAX_ROW_COUNT) {
    return NextResponse.json(
      {
        error:
          `File contains ${totalDataRows.toLocaleString()} rows. ` +
          `Maximum per upload is ${MAX_ROW_COUNT.toLocaleString()}. Split the file.`,
      },
      { status: 400 },
    );
  }

  // ── 6. Audit: upload started ───────────────────────────────────────────────

  const meta = extractRequestMeta(request.headers);
  await logAuditEvent({
    adminId: session.adminId,
    action: "BULK_UPLOAD_STARTED",
    entity: "grades",
    after: {
      fileName: file.name,
      fileSize: file.size,
      rowCount: totalDataRows,
    },
    ...meta,
  });

  // ── 7. Validate (pre-fetches all lookup maps in 4 queries) ─────────────────

  const { validRows, failedRows } = await validateGradeBatch(rawRows);

  // ── 8. Insert valid rows ───────────────────────────────────────────────────

  const result: GradeBulkResult = await runGradeBulkInsertPipeline(
    validRows,
    failedRows,
    totalDataRows,
  );

  // ── 9. Audit: upload completed ─────────────────────────────────────────────

  await logAuditEvent({
    adminId: session.adminId,
    action: "BULK_UPLOAD_COMPLETED",
    entity: "grades",
    after: {
      fileName: file.name,
      totalRows: result.totalRows,
      successCount: result.successCount,
      failureCount: result.failureCount,
      durationMs: result.durationMs,
    },
    ...meta,
  });

  return NextResponse.json(result, { status: 200 });
}
