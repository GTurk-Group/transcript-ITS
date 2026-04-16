"use server";

/**
 * Transcript server actions.
 *
 * generateTranscriptAction — full pipeline: assemble → PDF → store → DB record
 * deleteTranscriptAction   — remove PDF from storage + DB record
 *
 * PDF storage now goes through lib/storage which automatically uses
 * S3/R2/MinIO in production or .transcripts/ locally in development.
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { transcripts } from "@/db/schema";
import { assertPermission } from "@/lib/auth/rbac";
import { logAuditEvent, extractRequestMeta } from "@/lib/audit";
import { generateTranscript } from "@/lib/transcript";
import { renderTranscriptHtml } from "@/lib/pdf/template";
import { renderHTMLToPDF } from "@/lib/pdf/generator";
import { uploadPDF, deletePDF } from "@/lib/storage";
import type { ActionState } from "@/types/auth";

// ─── Generate transcript ──────────────────────────────────────────────────────

export async function generateTranscriptAction(
  studentId: string,
): Promise<
  ActionState<{ transcriptRecordId: string; transcriptNumber: string }>
> {
  const session = await assertPermission("generate_transcripts");

  if (!studentId) {
    return { status: "error", error: "Student ID is required." };
  }

  const headerStore = await headers();
  const meta = extractRequestMeta(headerStore);

  // ── 1. Assemble transcript object ─────────────────────────────────────────
  const genResult = await generateTranscript(
    studentId,
    session.adminId,
    headerStore,
  );

  if (!genResult.ok) {
    return { status: "error", error: genResult.error.message };
  }

  const { transcript, transcriptRecordId, transcriptNumber } = genResult;

  // ── 2. Render HTML → PDF bytes ────────────────────────────────────────────
  let pdfBytes: Buffer;
  try {
    const html = renderTranscriptHtml(transcript);
    const { bytes } = await renderHTMLToPDF(html);
    pdfBytes = bytes;
  } catch (err) {
    // Mark the transcript record as failed
    await db
      .update(transcripts)
      .set({
        status: "FAILED",
        errorMessage:
          err instanceof Error ? err.message : "PDF generation failed",
      })
      .where(eq(transcripts.id, transcriptRecordId));

    return {
      status: "error",
      error: "PDF generation failed. Please try again.",
    };
  }

  // ── 3. Store PDF (S3 or local) ────────────────────────────────────────────
  const filename = `${transcriptNumber}.pdf`;

  let fileKey: string;
  try {
    const stored = await uploadPDF(filename, pdfBytes);
    fileKey = stored.fileKey;
  } catch (err) {
    await db
      .update(transcripts)
      .set({
        status: "FAILED",
        errorMessage:
          err instanceof Error ? err.message : "File storage failed",
      })
      .where(eq(transcripts.id, transcriptRecordId));

    return { status: "error", error: "Failed to save PDF. Please try again." };
  }

  // ── 4. Update transcript record with file key ─────────────────────────────
  await db
    .update(transcripts)
    .set({ fileKey, status: "COMPLETED" })
    .where(eq(transcripts.id, transcriptRecordId));

  revalidatePath(`/transcripts/${studentId}`);

  return {
    status: "success",
    data: { transcriptRecordId, transcriptNumber },
  };
}

// ─── Delete transcript ────────────────────────────────────────────────────────

export async function deleteTranscriptAction(
  transcriptId: string,
): Promise<ActionState> {
  const session = await assertPermission("generate_transcripts");

  if (!transcriptId)
    return { status: "error", error: "Invalid transcript ID." };

  const [record] = await db
    .select()
    .from(transcripts)
    .where(eq(transcripts.id, transcriptId))
    .limit(1);

  if (!record) return { status: "error", error: "Transcript not found." };

  // Delete the PDF from storage (S3 or local)
  if (record.fileKey) {
    await deletePDF(record.fileKey).catch(() => {
      // File may already be gone — not fatal
    });
  }

  // Delete the DB record
  await db.delete(transcripts).where(eq(transcripts.id, transcriptId));

  // Audit
  const headerStore = await headers();
  await logAuditEvent({
    adminId: session.adminId,
    action: "DELETE_TRANSCRIPT",
    entity: "transcripts",
    entityId: transcriptId,
    before: {
      transcriptNumber: record.transcriptNumber,
      studentId: record.studentId,
      fileKey: record.fileKey,
    },
    ...extractRequestMeta(headerStore),
  });

  revalidatePath(`/transcripts/${record.studentId}`);

  return { status: "success" };
}
