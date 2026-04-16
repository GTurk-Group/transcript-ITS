/**
 * @deprecated This file is superseded by lib/gpa/index.ts.
 *
 * IMPORTANT: TypeScript resolves `@/lib/gpa` to this file (lib/gpa.ts)
 * when both lib/gpa.ts and lib/gpa/index.ts exist, because the file
 * takes precedence over the directory index.
 *
 * This file now re-exports everything from lib/gpa/ so existing imports
 * continue to work without any change to call sites.
 */

export {
  calculateSemesterGPA,
  calculateCGPA,
  formatGPA,
  formatSemesterLabel,
  DEFAULT_GRADE_SCALE,
} from "./gpa/index";

export type {
  SemesterGPAResult,
  CGPAResult,
  GradeClassification,
} from "./gpa/types";
