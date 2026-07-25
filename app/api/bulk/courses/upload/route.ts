/**
 * POST /api/bulk/courses/upload
 * Parses, validates, and inserts courses from a CSV file.
 * Auth: manage_courses permission (ADMIN+).
 *
 * CSV columns: code, title, credit_hours, is_scoring
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";
import { can } from "@/lib/auth/permissions";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { z } from "zod";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 2_000;

const rowSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  title: z.string().min(1, "Title is required").max(255),
  creditHours: z.coerce
    .number()
    .int()
    .min(1, "credit_hours must be at least 1"),
  isScoring: z.string().transform((v) => v.toLowerCase() !== "false"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session, "manage_courses"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // ── File ──────────────────────────────────────────────────────────────────
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "File exceeds 5 MB." }, { status: 413 });

  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2)
    return NextResponse.json(
      { error: "CSV must have a header and at least one data row." },
      { status: 400 },
    );

  // ── Parse header ──────────────────────────────────────────────────────────
  const header = lines[0]
    .toLowerCase()
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  const codeIdx = header.indexOf("code");
  const titleIdx = header.indexOf("title");
  const creditIdx = header.findIndex(
    (h) => h === "credit_hours" || h === "credithours" || h === "credits",
  );
  const scoringIdx = header.findIndex(
    (h) => h === "is_scoring" || h === "isscoring" || h === "scoring",
  );

  if (codeIdx === -1 || titleIdx === -1 || creditIdx === -1) {
    return NextResponse.json(
      {
        error: `Missing required columns. Found: [${header.join(", ")}]. Need: code, title, credit_hours.`,
      },
      { status: 400 },
    );
  }

  const dataLines = lines.slice(1).slice(0, MAX_ROWS);

  // ── Validate rows ─────────────────────────────────────────────────────────
  type ValidRow = {
    code: string;
    title: string;
    creditHours: number;
    isScoring: boolean;
  };
  type FailedRow = { row: number; message: string };

  const valid: ValidRow[] = [];
  const failures: FailedRow[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const rowNum = i + 2;
    const cols = dataLines[i]
      .split(",")
      .map((c) => c.trim().replace(/^"|"$/g, ""));

    const parsed = rowSchema.safeParse({
      code: cols[codeIdx],
      title: cols[titleIdx],
      creditHours: cols[creditIdx],
      isScoring: scoringIdx >= 0 ? cols[scoringIdx] : "true",
    });

    if (!parsed.success) {
      failures.push({ row: rowNum, message: parsed.error.issues[0].message });
    } else {
      const dup = valid.find(
        (v) => v.code.toLowerCase() === parsed.data.code.toLowerCase(),
      );
      if (dup) {
        failures.push({
          row: rowNum,
          message: `Duplicate code "${parsed.data.code}" in this file.`,
        });
      } else {
        valid.push(parsed.data);
      }
    }
  }

  // ── Check DB for existing codes ───────────────────────────────────────────
  const existingCodes = new Set(
    (await db.select({ code: courses.code }).from(courses)).map((e) =>
      e.code.toLowerCase(),
    ),
  );

  const toInsert: ValidRow[] = [];
  for (const row of valid) {
    if (existingCodes.has(row.code.toLowerCase())) {
      failures.push({ row: 0, message: `Code "${row.code}" already exists.` });
    } else {
      toInsert.push(row);
    }
  }

  // ── Batch insert ──────────────────────────────────────────────────────────
  let inserted = 0;
  const BATCH = 100;

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    try {
      await db.insert(courses).values(
        batch.map((r) => ({
          code: r.code.toUpperCase(),
          title: r.title,
          creditHours: r.creditHours,
          isScoring: r.isScoring,
          isActive: true,
        })),
      );
      inserted += batch.length;
    } catch {
      for (const row of batch) {
        try {
          await db.insert(courses).values({
            code: row.code.toUpperCase(),
            title: row.title,
            creditHours: row.creditHours,
            isScoring: row.isScoring,
            isActive: true,
          });
          inserted++;
        } catch (e) {
          failures.push({
            row: 0,
            message: `"${row.code}" — ${e instanceof Error ? e.message : "Insert failed"}`,
          });
        }
      }
    }
  }

  return NextResponse.json({
    successCount: inserted,
    failureCount: failures.length,
    totalRows: dataLines.length,
    failures,
  });
}
