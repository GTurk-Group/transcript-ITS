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
import type { ActionState } from "@/types/auth";

type RecordResult = {
  transcriptRecordId: string;
  transcriptNumber: string;
};

/**
 * Creates a transcript record in the DB for audit/history.
 * No PDF is generated — the user prints directly from the browser.
 */
export async function recordTranscriptAction(
  studentId: string,
): Promise<ActionState<RecordResult>> {
  const session = await assertPermission("generate_transcripts");

  if (!studentId || typeof studentId !== "string") {
    return { status: "error", error: "Invalid student ID." };
  }

  const headerStore = await headers();
  const outcome = await generateTranscript(
    studentId,
    session.adminId,
    headerStore,
  );

  if (!outcome.ok) {
    const { error } = outcome;
    if (error.code === "STUDENT_NOT_FOUND")
      return { status: "error", error: "Student not found." };
    if (error.code === "INSTITUTION_NOT_FOUND")
      return { status: "error", error: error.message };
    if (error.code === "NO_GRADE_RECORDS")
      return { status: "error", error: error.message };
    return {
      status: "error",
      error: "Failed to create transcript record. Please try again.",
    };
  }

  revalidatePath(`/transcripts/${studentId}`);

  return {
    status: "success",
    data: {
      transcriptRecordId: outcome.result.transcriptRecordId,
      transcriptNumber: outcome.result.transcriptNumber,
    },
  };
}

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

  if (!record)
    return { status: "error", error: "Transcript record not found." };

  await db.delete(transcripts).where(eq(transcripts.id, transcriptId));

  const headerStore = await headers();
  await logAuditEvent({
    adminId: session.adminId,
    action: "DELETE_TRANSCRIPT",
    entity: "transcripts",
    entityId: transcriptId,
    before: {
      transcriptNumber: record.transcriptNumber,
      studentId: record.studentId,
    },
    ...extractRequestMeta(headerStore),
  });

  revalidatePath(`/transcripts/${record.studentId}`);
  return { status: "success" };
}
