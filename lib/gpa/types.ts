/**
 * GPA module types.
 *
 * All shapes flow from the SQL aggregation results upward.
 * Nothing here depends on DB or Next.js — safe to import anywhere.
 */

// ─── SQL aggregate row shapes ─────────────────────────────────────────────────
// These mirror exactly what the DB returns. Numeric columns come back
// as strings from pg/Drizzle — we parse them explicitly at the boundary.

/**
 * Raw row produced by the SGPA aggregation query.
 * One row per student+semester combination.
 */
export type SemesterAggregateRow = {
  semesterId: string;
  semesterYear: number;
  semesterTerm: "FIRST" | "SECOND";
  /** SUM(computed_quality_points) — string because PostgreSQL numeric → JS string */
  totalQualityPoints: string;
  /** SUM(credit_hours) where is_scoring = true */
  creditsAttempted: string;
  /**
   * SUM(credit_hours) WHERE grade != 'F' AND is_scoring = true.
   * Computed via CASE WHEN inside the SUM — single query pass.
   */
  creditsEarned: string;
  /** COUNT(*) of scoring courses — useful for validation / display */
  courseCount: string;
};

// ─── Computed result types ────────────────────────────────────────────────────

/** Result of calculateSemesterGPA */
export type SemesterGPAResult = {
  semesterId: string;
  semesterYear: number;
  semesterTerm: "FIRST" | "SECOND";
  /** e.g. "2022/2023 – First Semester" */
  label: string;
  creditsAttempted: number;
  creditsEarned: number;
  totalQualityPoints: number;
  sgpa: number;
  /** Human-readable SGPA: always 2 decimal places */
  sgpaFormatted: string;
  courseCount: number;
};

/** Full result of calculateCGPA */
export type CGPAResult = {
  totalCreditsAttempted: number;
  totalCreditsEarned: number;
  totalQualityPoints: number;
  cgpa: number;
  /** Human-readable CGPA: always 2 decimal places */
  cgpaFormatted: string;
  classification: GradeClassification;
  /** Per-semester breakdown, ordered chronologically (oldest first) */
  semesters: SemesterGPAResult[];
};

/** CGPA band classification. Thresholds follow the standard 4.0 scale. */
export type GradeClassification =
  | "First Class"
  | "Second Class Upper"
  | "Second Class Lower"
  | "Third Class"
  | "Pass"
  | "Fail"
  | "No Results";
