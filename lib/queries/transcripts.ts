/**
 * @deprecated Use lib/transcript instead.
 * assembleTranscriptData → assembleTranscript (from @/lib/transcript)
 * TranscriptData         → TranscriptObject  (from @/lib/transcript)
 *
 * This file is retained for backward compatibility during migration.
 * Remove once all callers have been updated.
 */
/**
 * Transcript data assembly.
 *
 * Fetches every piece of data required to render a transcript PDF
 * in the minimum number of database roundtrips.
 *
 * GPA is sourced from calculateCGPA() — SQL aggregation, not row-by-row
 * summation. Grade rows are fetched separately for the per-course table only.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  students,
  programmes,
  institution,
  registrar,
  transcripts,
} from "@/db/schema";
// import { fetchStudentGradeRows } from "./grades";
import { calculateCGPA } from "@/lib/gpa";
import type { CGPAResult } from "@/lib/gpa";

// ─── Assembled data shape ─────────────────────────────────────────────────────

export type TranscriptStudent = {
  id: string;
  indexNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  level: number;
  entryYear: string;
  graduationYear: string;
  status: string;
  programme: {
    id: string;
    name: string;
    code: string;
  };
};

export type TranscriptInstitution = {
  id: string;
  name: string;
  address: string | null;
  logoPath: string | null;
};

export type TranscriptRegistrar = {
  id: string;
  name: string;
  title: string;
  signaturePath: string | null;
};

export type TranscriptData = {
  /** Unique transcript number — used as the document reference */
  transcriptNumber: string;
  generatedAt: string; // ISO-8601 string — stable for checksum
  generatedByAdminId: string;
  student: TranscriptStudent;
  institution: TranscriptInstitution;
  registrar: TranscriptRegistrar | null;
  /** SQL-aggregated GPA — not computed from raw row iteration */
  gpa: CGPAResult;
};

// ─── Assembly function ────────────────────────────────────────────────────────

/**
 * Assemble all data required to render a transcript.
 *
 * Returns null if:
 *  - The student does not exist
 *  - No institution record exists (system not configured)
 *
 * Throws on database errors — let the caller decide how to handle.
 */
export async function assembleTranscriptData(
  studentId: string,
  transcriptNumber: string,
  generatedByAdminId: string,
): Promise<TranscriptData | null> {
  // Run student lookup and GPA aggregation in parallel
  const [studentRows, gpa] = await Promise.all([
    db
      .select({
        id: students.id,
        indexNumber: students.indexNumber,
        firstName: students.firstName,
        lastName: students.lastName,
        level: students.level,
        entryYear: students.entryYear,
        graduationYear: students.graduationYear,
        status: students.status,
        programmeId: programmes.id,
        programmeName: programmes.name,
        programmeCode: programmes.code,
      })
      .from(students)
      .innerJoin(programmes, eq(students.programmeId, programmes.id))
      .where(eq(students.id, studentId))
      .limit(1),

    // SQL aggregation — one query, O(semesters) rows back
    calculateCGPA(studentId),
  ]);

  if (studentRows.length === 0) return null;
  const s = studentRows[0];

  // Institution and active registrar
  const [institutionRows, registrarRows] = await Promise.all([
    db.select().from(institution).limit(1),
    db.select().from(registrar).where(eq(registrar.isActive, true)).limit(1),
  ]);

  if (institutionRows.length === 0) return null;
  const inst = institutionRows[0];
  const reg = registrarRows[0] ?? null;

  return {
    transcriptNumber,
    generatedAt: new Date().toISOString(),
    generatedByAdminId,
    student: {
      id: s.id,
      indexNumber: s.indexNumber,
      firstName: s.firstName,
      lastName: s.lastName,
      fullName: `${s.firstName} ${s.lastName}`,
      level: s.level,
      entryYear: s.entryYear.toString(),
      graduationYear: s.graduationYear.toString(),
      status: s.status,
      programme: {
        id: s.programmeId,
        name: s.programmeName,
        code: s.programmeCode,
      },
    },
    institution: {
      id: inst.id,
      name: inst.name,
      address: inst.address,
      logoPath: inst.logoPath,
    },
    registrar: reg
      ? {
          id: reg.id,
          name: reg.name,
          title: reg.title,
          signaturePath: reg.signaturePath,
        }
      : null,
    gpa,
  };
}

/**
 * Fetch a transcript record by student ID (most recent first).
 */
export async function fetchStudentTranscripts(studentId: string) {
  return db
    .select()
    .from(transcripts)
    .where(eq(transcripts.studentId, studentId))
    .orderBy(transcripts.createdAt);
}

/**
 * Generate a unique transcript number.
 * Format: TRN-{YEAR}-{RANDOMHEX8}
 * e.g. TRN-2024-A3F7C2B1
 */
export function generateTranscriptNumber(): string {
  const year = new Date().getFullYear();
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join("");
  return `TRN-${year}-${hex}`;
}
