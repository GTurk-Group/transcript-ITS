/**
 * lib/transcript public API.
 *
 * All consumers import from "@/lib/transcript", not from the sub-modules.
 *
 * Primary entry points:
 *   generateTranscript()          — full generation pipeline
 *   assembleTranscript()          — data only (no DB record, no audit)
 *   computeTranscriptChecksum()   — integrity hashing
 *   verifyTranscriptChecksum()    — integrity verification
 *   generateTranscriptNumber()    — reference number generation
 */

export { generateTranscript } from "./generator";
export { assembleTranscript } from "./assembler";
export {
  generateTranscriptNumber,
  computeTranscriptChecksum,
  verifyTranscriptChecksum,
} from "./checksum";

export type {
  TranscriptObject,
  TranscriptSemester,
  TranscriptCourse,
  TranscriptSummary,
  TranscriptStudent,
  TranscriptInstitution,
  TranscriptRegistrar,
  TranscriptGenerationResult,
  TranscriptGenerationError,
  GradeClassification,
} from "./types";

export type { GenerateTranscriptOutcome } from "./generator";
