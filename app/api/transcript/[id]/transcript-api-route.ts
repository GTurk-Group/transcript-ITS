/**
 * GET /api/transcript/[id]
 *
 * Streams a generated transcript PDF to the client.
 *
 * Security:
 *  - Verifies session via cookie (same JWT as the app)
 *  - Asserts view_transcripts permission
 *  - Reads the file from local storage (swap for S3 signed URL redirect in prod)
 *
 * In production with S3:
 *  Instead of streaming bytes through this route, generate a pre-signed URL
 *  (15 min TTL) and return a 302 redirect. This keeps PDF bytes off the
 *  app server and lets S3 handle bandwidth.
 */

import { type NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { transcripts } from "@/db/schema";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";
import { can } from "@/lib/auth/rbac";

const TRANSCRIPT_DIR = join(process.cwd(), ".transcripts");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // 1. Auth — read cookie directly (API routes don't use next/headers in Edge)
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Permission check
  if (!can(session, "view_transcripts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Look up transcript record
  const { id } = await params;
  const rows = await db
    .select()
    .from(transcripts)
    .where(eq(transcripts.id, id))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
  }

  const transcript = rows[0];

  // 4. Read PDF file
  //    In production: return a redirect to a pre-signed S3 URL instead.
  //    return NextResponse.redirect(await generateSignedUrl(transcript.fileKey));
  const fileKey = `${transcript.transcriptNumber}.pdf`;

  let bytes: Buffer;
  try {
    bytes = await readFile(join(TRANSCRIPT_DIR, fileKey));
  } catch {
    return NextResponse.json(
      { error: "Transcript file not found. It may need to be regenerated." },
      { status: 404 }
    );
  }

  // 5. Stream PDF with correct headers
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": bytes.length.toString(),
      // inline = open in browser, attachment = force download
      "Content-Disposition": `inline; filename="${transcript.transcriptNumber}.pdf"`,
      // Prevent caching — transcripts contain sensitive data
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
