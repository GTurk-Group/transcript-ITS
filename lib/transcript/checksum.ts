/**
 * Transcript reference number and data integrity utilities.
 *
 * ─── Transcript number format
 *
 *   TRN-{YEAR}-{HEX8}
 *   e.g. TRN-2024-A3F7C2B1
 *
 *   - YEAR: 4-digit calendar year of generation
 *   - HEX8: 8 uppercase hex characters from crypto.getRandomValues
 *            Collision probability: 1 in 4,294,967,296 per year
 *
 *   The number is stored in the transcripts table under a UNIQUE constraint
 *   so any collision causes a DB error that the generator retries.
 *
 * ─── Data integrity checksum
 *
 *   The transcript data payload (student + semester + course + GPA) is
 *   serialized to canonical JSON and SHA-256 hashed at generation time.
 *   The hash is stored on the transcripts row.
 *
 *   Any subsequent comparison between a new hash and the stored hash detects:
 *     - Tampering with grade records after generation
 *     - Tampering with student records after generation
 *     - Direct DB edits that bypassed the application
 *
 *   The hash covers TranscriptObject fields that would change if data changed,
 *   but NOT transcriptNumber / generatedAt / generatedByAdminId (metadata).
 *
 * No DB imports. Pure crypto. Safe everywhere.
 */

import { createHash } from "crypto";
import type { TranscriptObject } from "./types";

// ─── Reference number ─────────────────────────────────────────────────────────

/**
 * Generate a unique transcript reference number.
 * Uses Web Crypto (available in Node.js 15+, Bun, Deno, Edge Runtime).
 */
export function generateTranscriptNumber(): string {
  const year = new Date().getFullYear();
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join("");
  return `TRN-${year}-${hex}`;
}

// ─── Data integrity checksum ──────────────────────────────────────────────────

/**
 * Fields included in the integrity hash.
 * These are the academic data fields that would change if records were tampered with.
 * Metadata (transcriptNumber, generatedAt, generatedByAdminId) is deliberately excluded
 * — metadata fields don't represent academic data and change on every generation.
 */
type ChecksumPayload = Pick<
  TranscriptObject,
  "student" | "institution" | "semesters" | "summary"
>;

/**
 * Compute the SHA-256 integrity hash for a TranscriptObject.
 *
 * The payload is canonicalized before hashing:
 *   - Keys sorted alphabetically at every level (via replacer)
 *   - No whitespace in the JSON string
 *   - All number-typed fields stay as numbers (not strings)
 *
 * This ensures the same academic data always produces the same hash,
 * regardless of JS object key insertion order.
 *
 * Returns a 64-character lowercase hex string.
 */
export function computeTranscriptChecksum(
  transcript: TranscriptObject,
): string {
  const payload: ChecksumPayload = {
    student: transcript.student,
    institution: transcript.institution,
    semesters: transcript.semesters,
    summary: transcript.summary,
  };

  // Sort keys canonically at every nesting level
  const canonical = JSON.stringify(payload, sortedReplacer);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Verify a stored checksum against the current transcript data.
 * Returns true if the data is intact, false if it has changed.
 */
export function verifyTranscriptChecksum(
  transcript: TranscriptObject,
  storedChecksum: string,
): boolean {
  const current = computeTranscriptChecksum(transcript);
  // Constant-time comparison to prevent timing attacks
  if (current.length !== storedChecksum.length) return false;
  let diff = 0;
  for (let i = 0; i < current.length; i++) {
    diff |= current.charCodeAt(i) ^ storedChecksum.charCodeAt(i);
  }
  return diff === 0;
}

// ─── Internal ─────────────────────────────────────────────────────────────────

/**
 * JSON.stringify replacer that sorts object keys alphabetically.
 * Produces a canonical representation regardless of insertion order.
 */
function sortedReplacer(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    );
  }
  return value;
}
