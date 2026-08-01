/**
 * GET /api/templates/courses
 * Serves the pre-built courses bulk upload Excel template.
 * Place courses-template.xlsx in public/templates/ before deploying.
 */
import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const filePath = join(
      process.cwd(),
      "public",
      "templates",
      "courses-template.xlsx",
    );
    const bytes = await readFile(filePath);

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="courses-template.xlsx"',
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Template file not found. Make sure courses-template.xlsx is in public/templates/.",
      },
      { status: 404 },
    );
  }
}
