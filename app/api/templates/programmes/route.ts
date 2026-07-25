/**
 * GET /api/templates/programmes
 * Returns a CSV template for bulk programme import.
 */
import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const csv = [
    "name,code",
    "Bachelor of Science in Computer Science,BSC_CS",
    "Bachelor of Education in Mathematics,BED_MATH",
    "Diploma in Information Technology,DIT",
    "Bachelor of Arts in English,BA_ENG",
  ].join("\r\n");

  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="programmes-template.csv"',
      "Cache-Control": "private, max-age=3600",
    },
  });
}
