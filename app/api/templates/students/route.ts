/**
 * GET /api/templates/students
 *
 * Downloads the student bulk upload CSV template.
 *
 * Auth: bulk_upload permission (ADMIN+).
 *
 * Response characteristics:
 *   Content-Type:        text/csv; charset=utf-8
 *   Content-Disposition: attachment (triggers browser Save dialog)
 *   Content-Length:      set so download progress bars work
 *   Cache-Control:       private, max-age=3600
 *                        The template content is static — it can be cached
 *                        for one hour. Use private so CDNs don't share it
 *                        between different authenticated users.
 *   ETag:                a hash of the template content for conditional GETs
 *
 * The response body is UTF-8 with a leading BOM (\uFEFF) so Excel on
 * Windows opens it without the CSV import wizard.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";
import { can } from "@/lib/auth/rbac";
import { generateStudentTemplate, TEMPLATE_SPECS } from "@/lib/templates";

const spec = TEMPLATE_SPECS.find((s) => s.id === "students")!;

// Pre-generate once at module load — content is static
const TEMPLATE_CONTENT = generateStudentTemplate();
const TEMPLATE_BYTES = Buffer.from(TEMPLATE_CONTENT, "utf-8");
const TEMPLATE_ETAG = `"${createHash("sha256").update(TEMPLATE_BYTES).digest("hex").slice(0, 16)}"`;

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ── Auth ───────────────────────────────────────────────────────────────────

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session, "bulk_upload"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // ── Conditional GET (ETag) ─────────────────────────────────────────────────
  // Return 304 if the client already has this version.

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
