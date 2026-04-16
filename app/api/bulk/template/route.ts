/**
 * GET /api/bulk/template
 *
 * Legacy alias — redirects to /api/templates/students.
 * Kept so existing bookmarks and `<a href>` links continue to work.
 */

import { type NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest): NextResponse {
  return NextResponse.redirect(
    new URL("/api/templates/students", request.url),
    { status: 301 }
  );
}
