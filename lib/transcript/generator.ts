/**
 * Transcript generator.
 *
 * generateTranscript() is the single entry point for creating a transcript.
 * It orchestrates:
 *
 *   1. Assemble      — parallel DB queries → TranscriptObject (via assembler)
 *   2. Stamp         — add transcriptNumber, generatedAt, generatedByAdminId
 *   3. Checksum      — SHA-256 over the academic data payload
 *   4. Persist       — insert row into transcripts table
 *   5. Audit         — write detailed audit log entry (non-blocking)
 *   6. Return        — TranscriptGenerationResult
 *
 * The PDF render step is NOT here — this module produces data only.
 * The server action (actions/transcripts.ts) receives this result and
 * passes it to the PDF renderer separately. This separation means:
 *   - Transcript data can be inspected / previewed without a PDF render
 *   - PDF rendering failures don't prevent the DB record from existing
 *   - Unit tests can verify the TranscriptObject without Puppeteer
 *
 * ─── Retry on transcript number collision
 *
 * The transcripts table has a UNIQUE constraint on transcriptNumber.
 * The generator retries up to MAX_RETRIES times on a unique-constraint
 * error before giving up. In practice this never triggers — at 4 billion
 * possible values per year, a collision requires > 65,000 generations per
 * year to reach a 1-in-1,000 probability.
 */

import { db } from "@/db";
import { transcripts } from "@/db/schema";
import { logAuditEvent, extractRequestMeta } from "@/lib/audit";
import { parseDbError } from "@/lib/actions/utils";
import { assembleTranscript } from "./assembler";
import {
  generateTranscriptNumber,
  computeTranscriptChecksum,
} from "./checksum";
import type {
  TranscriptObject,
  TranscriptGenerationResult,
  TranscriptGenerationError,
} from "./types";

const MAX_RETRIES = 3;

// ─── Result type ──────────────────────────────────────────────────────────────

export type GenerateTranscriptOutcome =
  | { ok: true; result: TranscriptGenerationResult }
  | { ok: false; error: TranscriptGenerationError };

// ─── Entry point ──────────────────────────────────────────────────────────────

/**
 * Generate a transcript for a student.
 *
 * @param studentId           UUID of the student
 * @param generatedByAdminId  UUID of the admin triggering generation
 * @param requestHeaders      Next.js Headers object for audit metadata (ip, ua)
 */
export async function generateTranscript(
  studentId: string,
  generatedByAdminId: string,
  requestHeaders: Headers,
): Promise<GenerateTranscriptOutcome> {
  // ── Step 1: Assemble ───────────────────────────────────────────────────────

  const assembleResult = await assembleTranscript(studentId);

  if (!assembleResult.ok) {
    return { ok: false, error: assembleResult.error };
  }

  // ── Step 2: Stamp metadata ─────────────────────────────────────────────────

  const generatedAt = new Date().toISOString();

  // Try up to MAX_RETRIES times to get a unique transcript number
  let transcriptNumber = generateTranscriptNumber();
  let transcriptRecord: typeof transcripts.$inferSelect | null = null;
  let lastError: unknown = null;

  const transcript: TranscriptObject = {
    ...assembleResult.transcript,
    transcriptNumber,
    generatedAt,
    generatedByAdminId,
  };

  // ── Step 3: Checksum ───────────────────────────────────────────────────────

  const checksum = computeTranscriptChecksum(transcript);

  // ── Step 4: Persist with retry on number collision ─────────────────────────

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Regenerate number on collision
      transcriptNumber = generateTranscriptNumber();
      transcript.transcriptNumber = transcriptNumber;
    }

    try {
      [transcriptRecord] = await db
        .insert(transcripts)
        .values({
          studentId,
          transcriptNumber,
          generatedBy: generatedByAdminId,
          // These columns require the schema additions recommended in the audit review.
          // Apply them and uncomment:
          // fileKey:    null,              // set by the PDF render step
          // checksum:   checksum,
          // status:     "COMPLETED",
        })
        .returning();

      lastError = null;
      break; // success
    } catch (err) {
      const e = parseDbError(err);
      if (e.type === "unique" && attempt < MAX_RETRIES - 1) {
        lastError = err;
        continue; // retry with a new number
      }

      // Non-unique error, or retries exhausted
      console.error("[generateTranscript] DB insert failed:", err);
      return {
        ok: false,
        error: {
          code: "DB_ERROR",
          message: "Failed to record the transcript. Please try again.",
          cause: err,
        },
      };
    }
  }

  if (!transcriptRecord) {
    return {
      ok: false,
      error: {
        code: "DB_ERROR",
        message:
          "Failed to generate a unique transcript number after multiple attempts.",
        cause: lastError,
      },
    };
  }

  // ── Step 5: Audit log ──────────────────────────────────────────────────────
  //
  // The audit log captures the full academic snapshot so we have a paper trail
  // even if grade records are later corrected. It is non-blocking — a failure
  // here does not prevent the transcript from being returned.

  const meta = extractRequestMeta(requestHeaders);

  await logAuditEvent({
    adminId: generatedByAdminId,
    action: "GENERATE_TRANSCRIPT",
    entity: "transcripts",
    entityId: transcriptRecord.id,
    after: {
      transcriptNumber,
      checksum,
      studentId,
      studentName: transcript.student.fullName,
      studentIndex: transcript.student.indexNumber,
      programme: transcript.student.programme.name,
      cgpa: transcript.summary.cgpa,
      cgpaFormatted: transcript.summary.cgpaFormatted,
      classification: transcript.summary.classification,
      totalCreditsAttempted: transcript.summary.totalCreditsAttempted,
      totalCreditsEarned: transcript.summary.totalCreditsEarned,
      semesterCount: transcript.semesters.length,
      totalCourseCount: transcript.semesters.reduce(
        (n, s) => n + s.courses.length,
        0,
      ),
      generatedAt,
    },
    ...meta,
  });

  // ── Step 6: Return ─────────────────────────────────────────────────────────

  return {
    ok: true,
    result: {
      transcript,
      transcriptRecordId: transcriptRecord.id,
      transcriptNumber,
    },
  };
}
