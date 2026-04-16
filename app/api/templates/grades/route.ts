/**
 * GET /api/templates/grades
 *
 * Downloads the grade bulk upload CSV template.
 *
 * Auth: bulk_upload permission (ADMIN+).
 *
 * The template body includes inline instructions about computed columns
 * (gradePoint, creditHours, computedQualityPoints) that the server derives
 * from the grade letter — users must not add these columns.
 *
 * See lib/templates/index.ts for the template content and formatting rules.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";
import { can } from "@/lib/auth/rbac";
import { generateGradesTemplate, TEMPLATE_SPECS } from "@/lib/templates";

const spec = TEMPLATE_SPECS.find((s) => s.id === "grades")!;

const TEMPLATE_CONTENT = generateGradesTemplate();
const TEMPLATE_BYTES = Buffer.from(TEMPLATE_CONTENT, "utf-8");
const TEMPLATE_ETAG = `"${createHash("sha256").update(TEMPLATE_BYTES).digest("hex").slice(0, 16)}"`;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session, "bulk_upload"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (request.headers.get("if-none-match") === TEMPLATE_ETAG) {
    return new NextResponse(null, { status: 304 });
  }

  return new NextResponse(TEMPLATE_BYTES, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${spec.filename}"`,
      "Content-Length": String(TEMPLATE_BYTES.length),
      "Cache-Control": "private, max-age=3600",
      ETag: TEMPLATE_ETAG,
    },
  });
}
