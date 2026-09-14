/**
 * POST /api/bulk/programmes/upload
 * CSV columns: name, code, programme_type (optional)
 *
 * Uniqueness rule: (name + code) composite must be unique.
 * Same code with a different name = allowed.
 * Same name with a different code = allowed.
 * Same name AND same code = duplicate, skipped.
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";
import { can } from "@/lib/auth/permissions";
import { db } from "@/db";
import { programmes } from "@/db/schema";
import { z } from "zod";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 2_000;

const rowSchema = z.object({
  name: z
    .string()
    .min(2, "Programme name must be at least 2 characters")
    .max(255),
  code: z.string().min(1, "Programme code is required").max(50),
  programmeType: z.enum(["DEGREE", "DIPLOMA"]).default("DEGREE"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session, "manage_programmes"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected a multipart/form-data file upload." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json(
      { error: "No file was attached. Please select a CSV file." },
      { status: 400 },
    );
  if (file.size > MAX_BYTES)
    return NextResponse.json(
      {
        error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed is 5 MB.`,
      },
      { status: 413 },
    );
  if (!file.name.toLowerCase().endsWith(".csv"))
    return NextResponse.json(
      {
        error:
          "Only CSV files are accepted. Open the Excel template, fill in your data, then File → Save As → CSV UTF-8.",
      },
      { status: 400 },
    );

  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2)
    return NextResponse.json(
      {
        error:
          "The file has no data rows. Add your programme data below the header row and try again.",
      },
      { status: 400 },
    );

  const header = lines[0]
    .toLowerCase()
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  const nameIdx = header.indexOf("name");
  const codeIdx = header.indexOf("code");
  const typeIdx = header.findIndex((h) =>
    ["programme_type", "programmetype", "type"].includes(h),
  );

  if (nameIdx === -1 || codeIdx === -1) {
    const missing = [nameIdx === -1 && "name", codeIdx === -1 && "code"]
      .filter(Boolean)
      .join(", ");
    return NextResponse.json(
      {
        error: `Missing required column(s): ${missing}. Your header row is: [${header.join(", ")}]. Download the template to see the correct format.`,
      },
      { status: 400 },
    );
  }

  const dataLines = lines.slice(1).slice(0, MAX_ROWS);
  type ValidRow = {
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
    const rawName = cols[nameIdx] ?? "";
    const rawCode = cols[codeIdx] ?? "";
    const rawType = typeIdx >= 0 ? (cols[typeIdx] ?? "DEGREE") : "DEGREE";

    if (!rawName && !rawCode) continue; // skip blank rows

    const parsed = rowSchema.safeParse({
      name: rawName,
      code: rawCode,
      programmeType: rawType.toUpperCase() || "DEGREE",
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      failures.push({
        row: rowNum,
        message: `${issue.path[0] === "name" ? `"name" column (got: "${rawName || "(empty)"}")` : `"code" column (got: "${rawCode || "(empty)"}")`} — ${issue.message}`,
      });
      continue;
    }

    // Check for composite duplicate within this batch
    const key = `${parsed.data.name.toLowerCase()}::${parsed.data.code.toLowerCase()}`;
    const dup = valid.find(
      (v) => `${v.name.toLowerCase()}::${v.code.toLowerCase()}` === key,
    );
    if (dup) {
      failures.push({
        row: rowNum,
        message: `Duplicate in file: programme "${parsed.data.name}" with code "${parsed.data.code}" appears more than once. The name+code combination must be unique.`,
      });
      continue;
    }

    valid.push(parsed.data);
  }

  // Check against DB — composite (name, code) must be unique
  const existing = await db
    .select({ name: programmes.name, code: programmes.code })
    .from(programmes);

  const existingKeys = new Set(
    existing.map((e) => `${e.name.toLowerCase()}::${e.code.toLowerCase()}`),
  );

  const toInsert: ValidRow[] = [];
  for (const row of valid) {
    const key = `${row.name.toLowerCase()}::${row.code.toLowerCase()}`;
    if (existingKeys.has(key)) {
      failures.push({
        row: 0,
        message:
          `Programme "${row.name}" with code "${row.code.toUpperCase()}" already exists in the database. ` +
          `You can use the same name with a different code, or the same code with a different name.`,
      });
    } else {
      toInsert.push(row);
    }
  }

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const batch = toInsert.slice(i, i + 100);
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
          const msg = e instanceof Error ? e.message.toLowerCase() : "";
          const friendly =
            msg.includes("unique") || msg.includes("duplicate")
              ? `Programme "${row.name}" with code "${row.code.toUpperCase()}" already exists. The name+code combination must be unique.`
              : `Could not save "${row.code}": ${e instanceof Error ? e.message : "Unknown database error"}`;
          failures.push({ row: 0, message: friendly });
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
