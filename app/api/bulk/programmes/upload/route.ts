/**
 * POST /api/bulk/programmes/upload
 * Parses, validates, and inserts programmes from a CSV file.
 * Auth: manage_programmes permission (ADMIN+).
 *
 * CSV columns: name, code
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";
import { can } from "@/lib/auth/permissions";
import { db } from "@/db";
import { programmes } from "@/db/schema";
// import { ilike, or } from "drizzle-orm";
import { z } from "zod";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 2_000;

const rowSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  code: z.string().min(1, "Code is required").max(50),
  programmeType: z
    .string()
    .transform((value) => value.trim().toUpperCase())
    .pipe(z.enum(["DEGREE", "DIPLOMA"])),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session, "manage_programmes"))
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
      { error: "CSV must have a header row and at least one data row." },
      { status: 400 },
    );

  // ── Parse header ──────────────────────────────────────────────────────────
  const header = lines[0]
    .toLowerCase()
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  const nameIdx = header.indexOf("name");
  const codeIdx = header.indexOf("code");
  const programmeTypeIdx = header.indexOf("programme_type");
  if (nameIdx === -1 || codeIdx === -1) {
    return NextResponse.json(
      {
        error: `Missing required columns. Found: ${header.join(", ")}. Need: name, code.`,
      },
      { status: 400 },
    );
  }

  const dataLines = lines.slice(1).slice(0, MAX_ROWS);

  // ── Validate rows ─────────────────────────────────────────────────────────
  type ValidRow = {
    row: number;
    name: string;
    code: string;
    programmeType: "DEGREE" | "DIPLOMA";
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
      name: cols[nameIdx],
      code: cols[codeIdx],
      programmeType:
        programmeTypeIdx >= 0 ? cols[programmeTypeIdx] || "DEGREE" : "DEGREE",
    });
    if (!parsed.success) {
      failures.push({ row: rowNum, message: parsed.error.issues[0].message });
    } else {
      // Dedupe within batch
      const dup = valid.find(
        (v) => v.code.toLowerCase() === parsed.data.code.toLowerCase(),
      );
      if (dup) {
        failures.push({
          row: rowNum,
          message: `Duplicate code "${parsed.data.code}" in this file.`,
        });
      } else {
        valid.push({ row: rowNum, ...parsed.data });
      }
    }
  }

  // ── Check DB for existing codes/names ────────────────────────────────────
  const existing = await db
    .select({ name: programmes.name, code: programmes.code })
    .from(programmes);
  const existingCodes = new Set(existing.map((e) => e.code.toLowerCase()));
  const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));

  const toInsert: ValidRow[] = [];
  for (const row of valid) {
    if (existingCodes.has(row.code.toLowerCase())) {
      failures.push({
        row: row.row,
        message: `Code "${row.code}" already exists in the database.`,
      });
    } else if (existingNames.has(row.name.toLowerCase())) {
      failures.push({
        row: row.row,
        message: `Name "${row.name}" already exists in the database.`,
      });
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
      await db.insert(programmes).values(
        batch.map((r) => ({
          name: r.name,
          code: r.code.toUpperCase(),
          programmeType: r.programmeType,
          isActive: true,
        })),
      );
      inserted += batch.length;
    } catch {
      // Fall back to per-row
      for (const row of batch) {
        try {
          await db.insert(programmes).values({
            name: row.name,
            code: row.code.toUpperCase(),
            programmeType: row.programmeType,
            isActive: true,
          });
          inserted++;
        } catch (e) {
          failures.push({
            row: row.row,
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
