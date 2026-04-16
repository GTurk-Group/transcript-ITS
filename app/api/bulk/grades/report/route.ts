/**
 * POST /api/bulk/grades/report
 *
 * Accepts the failures array from a GradeBulkResult and streams a CSV
 * error report. The result lives in client memory — no server state needed.
 *
 * Auth: bulk_upload permission (ADMIN+).
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";
import { can } from "@/lib/auth/rbac";
import { generateGradeErrorReportCSV } from "@/lib/bulk/grades/report";
import type { GradeRowFailure } from "@/lib/bulk/grades/types";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session, "bulk_upload"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { failures: GradeRowFailure[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body?.failures)) {
    return NextResponse.json(
      { error: '"failures" must be an array.' },
      { status: 400 },
    );
  }

  if (body.failures.length > 5_000) {
    return NextResponse.json(
      { error: "Too many failure rows." },
      { status: 400 },
    );
  }

  const csv = generateGradeErrorReportCSV(body.failures);
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `grade-upload-errors-${timestamp}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
