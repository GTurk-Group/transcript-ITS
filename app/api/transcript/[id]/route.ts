/**
 * GET /api/transcript/[id] — stream a generated transcript PDF.
 *
 * Auth: any authenticated role (view_transcripts permission).
 * Storage: reads from lib/storage (S3 in production, local in dev).
 */

import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { transcripts } from "@/db/schema";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";
import { downloadPDF, getPresignedUrl } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // ── Fetch record ──────────────────────────────────────────────────────────
  const [record] = await db
    .select({
      id: transcripts.id,
      transcriptNumber: transcripts.transcriptNumber,
      fileKey: transcripts.fileKey,
      status: transcripts.status,
    })
    .from(transcripts)
    .where(eq(transcripts.id, id))
    .limit(1);

  if (!record) {
    return NextResponse.json(
      { error: "Transcript not found." },
      { status: 404 },
    );
  }

  if (record.status !== "COMPLETED" || !record.fileKey) {
    return NextResponse.json(
      {
        error: "PDF not yet available. The transcript may still be generating.",
      },
      { status: 404 },
    );
  }

  // ── S3: redirect to pre-signed URL for direct download ───────────────────
  const presignedUrl = await getPresignedUrl(record.fileKey, 300);
  if (presignedUrl) {
    return NextResponse.redirect(presignedUrl);
  }

  // ── Local: stream bytes from .transcripts/ ────────────────────────────────
  let bytes: Buffer;
  try {
    bytes = await downloadPDF(record.fileKey);
  } catch {
    return NextResponse.json(
      { error: "PDF file not found on disk." },
      { status: 404 },
    );
  }

  const filename = `${record.transcriptNumber}.pdf`;

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
    },
  });
}
