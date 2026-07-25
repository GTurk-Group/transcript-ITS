/**
 * GET /api/templates/courses
 * Returns a CSV template for bulk course import.
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
    "code,title,credit_hours,is_scoring",
    "MATH101,Introduction to Mathematics,3,true",
    "ENG101,English Language and Communication,3,true",
    "SCI201,Introduction to Science,3,true",
    "PE101,Physical Education,2,false",
    "ICT301,Information and Communication Technology,3,true",
    "PROJ600,Final Year Project,24,true",
  ].join("\r\n");

  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="courses-template.csv"',
      "Cache-Control": "private, max-age=3600",
    },
  });
}
