import type { TranscriptSemester } from "@/lib/transcript/types";
import { computeGPA, formatGPA } from "@/lib/gpa/compute";

export function formatTranscriptStudentName(
  lastName: string,
  firstName: string,
): string {
  return `${lastName.trim()}, ${firstName.trim()}`.toUpperCase();
}

/** 10/08/1975 */
export function formatTranscriptDateOfBirth(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** AUG2013 - JUL2017 */
export function formatStudyPeriod(
  entryYear: number,
  graduationYear: string | null | undefined,
): string {
  const endYear = graduationYear?.trim();
  if (!endYear) return `AUG${entryYear}`;
  return `AUG${entryYear} - JUL${endYear}`;
}

/** Wednesday, 21 January 2026 at: 16:35:35 */
export function formatTranscriptPrintedOn(iso: string): string {
  const date = new Date(iso);
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const day = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("en-GB", { hour12: false });
  return `${weekday}, ${day} at: ${time}`;
}

export type SemesterRunningTotals = TranscriptSemester & {
  cumulativeCreditsAttempted: number;
  cumulativeQualityPoints: number;
  cumulativeGpa: number;
  cumulativeGpaFormatted: string;
};

/** Running CCR / CGV / CGPA after each semester — matches the official transcript. */
export function withRunningTotals(
  semesters: TranscriptSemester[],
): SemesterRunningTotals[] {
  let cumulativeCreditsAttempted = 0;
  let cumulativeQualityPoints = 0;

  return semesters.map((semester) => {
    cumulativeCreditsAttempted += semester.creditsAttempted;
    cumulativeQualityPoints += semester.totalQualityPoints;
    const cumulativeGpa = computeGPA(
      cumulativeQualityPoints,
      cumulativeCreditsAttempted,
    );

    return {
      ...semester,
      cumulativeCreditsAttempted,
      cumulativeQualityPoints,
      cumulativeGpa,
      cumulativeGpaFormatted: formatGPA(cumulativeGpa),
    };
  });
}

export const UEW_CONTACT = {
  poBox: "P.O.BOX 25, WINNEBA - GHANA",
  email: "registrar@uew.edu.gh",
  website: "http://www.uew.edu.gh",
} as const;

export const TRANSCRIPT_FOOTER_LEGEND =
  "Grading Scheme: I/C=(Incomplete), X=(Withheld), AGT=0.0(Audit)";
