/**
 * Grade bulk upload CSV parser.
 *
 * Re-uses the same RFC 4180 parsing logic as the student parser
 * (copied here to avoid a cross-module coupling that would need
 * to be unwound if the student schema changes).
 *
 * Grade-specific additions:
 *   - Semester normalisation: "1", "first", "sem 1", "FIRST" → "FIRST"
 *   - Grade normalisation: "b+" → "B+", "a " → "A"
 *   - Flexible header aliases (courseCode, course_code, course, etc.)
 */

import type { RawGradeRow, GradeCSVColumn } from "./types";

// ─── RFC 4180 core parser ──────────────────────────────────────────────────────
// (Same algorithm as lib/bulk/parser.ts — see that file for line-by-line comments)

function parseCSV(text: string): string[][] {
  const clean = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < clean.length) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field.trim());
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      if (clean[i + 1] === "\n") i++;
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }
  while (rows.length > 0 && rows[rows.length - 1].every((f) => f === ""))
    rows.pop();
  return rows;
}

// ─── Header normalisation ─────────────────────────────────────────────────────

function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const GRADE_HEADER_MAP: Record<string, GradeCSVColumn> = {
  // indexNumber variants
  indexnumber: "indexNumber",
  index: "indexNumber",
  studentid: "indexNumber",
  studentnumber: "indexNumber",
  matno: "indexNumber",
  matricno: "indexNumber",

  // courseCode variants
  coursecode: "courseCode",
  course: "courseCode",
  code: "courseCode",
  subjectcode: "courseCode",
  subject: "courseCode",

  // semester variants
  semester: "semester",
  sem: "semester",
  term: "semester",

  // year variants
  year: "year",
  academicyear: "year",
  sessionyear: "year",

  // grade variants
  grade: "grade",
  score: "grade",
  result: "grade",
  lettergrade: "grade",
};

// ─── Semester normalisation ───────────────────────────────────────────────────

/**
 * Map whatever the user typed into "FIRST" | "SECOND" | null.
 * Accepts: FIRST, first, 1, sem1, "first semester", SECOND, second, 2, etc.
 */
export function normaliseSemester(raw: string): "FIRST" | "SECOND" | null {
  const v = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (["first", "1", "sem1", "semester1", "i"].includes(v)) return "FIRST";
  if (["second", "2", "sem2", "semester2", "ii"].includes(v)) return "SECOND";
  return null;
}

// ─── Grade normalisation ──────────────────────────────────────────────────────

/**
 * Normalise a grade string: trim, uppercase, collapse whitespace.
 * "b+" → "B+", " A " → "A", "b +" → "B+"
 */
export function normaliseGrade(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

// ─── Template generator ───────────────────────────────────────────────────────

export function generateGradeCSVTemplate(): string {
  const headers = [
    "indexNumber",
    "courseCode",
    "semester",
    "year",
    "grade",
  ].join(",");

  const exampleRows = [
    ["CS/2021/001", "MATH101", "FIRST", "2021", "A"].join(","),
    ["CS/2021/002", "MATH101", "FIRST", "2021", "B+"].join(","),
    ["CS/2021/001", "PHYS101", "SECOND", "2021", "C"].join(","),
  ].join("\n");

  const notes = [
    "# GRADE BULK UPLOAD TEMPLATE",
    "# Instructions:",
    "# - Delete these comment rows before uploading",
    "# - indexNumber must match an existing student",
    "# - courseCode must match an existing active course",
    "# - semester must be FIRST or SECOND",
    "# - year is the academic year (e.g. 2021 for 2021/2022)",
    "# - grade must be one of: A, B+, B, C+, C, D+, D, F",
    "# - duplicate (indexNumber + courseCode + semester + year) rows are rejected",
  ].join("\n");

  return `${notes}\n${headers}\n${exampleRows}\n`;
}

// ─── Main parse function ──────────────────────────────────────────────────────

type GradeParseResult = {
  rows: RawGradeRow[];
  missingHeaders: GradeCSVColumn[];
  unknownHeaders: string[];
  totalDataRows: number;
};

const REQUIRED_COLUMNS: GradeCSVColumn[] = [
  "indexNumber",
  "courseCode",
  "semester",
  "year",
  "grade",
];

export function parseGradeCSV(text: string): GradeParseResult {
  const allRows = parseCSV(text);

  if (allRows.length === 0) {
    return {
      rows: [],
      missingHeaders: [...REQUIRED_COLUMNS],
      unknownHeaders: [],
      totalDataRows: 0,
    };
  }

  const headerRow = allRows[0];
  const dataRows = allRows.slice(1);

  // Map column index → canonical column name
  const indexToColumn = new Map<number, GradeCSVColumn>();
  const unknownHeaders: string[] = [];

  for (let i = 0; i < headerRow.length; i++) {
    const norm = normaliseHeader(headerRow[i]);
    const canonical = GRADE_HEADER_MAP[norm];
    if (canonical) indexToColumn.set(i, canonical);
    else if (headerRow[i].trim() !== "") unknownHeaders.push(headerRow[i]);
  }

  const foundColumns = new Set(indexToColumn.values());
  const missingHeaders = REQUIRED_COLUMNS.filter((c) => !foundColumns.has(c));

  const nonEmptyData = dataRows.filter((r) => r.some((f) => f.trim() !== ""));

  const rows: RawGradeRow[] = nonEmptyData.map((row, idx) => {
    const mapped: Partial<Record<GradeCSVColumn, string>> = {};
    indexToColumn.forEach((col, colIdx) => {
      mapped[col] = row[colIdx] ?? "";
    });

    return {
      rowNumber: idx + 2, // +1 header, +1 for 1-based
      rawLine: row.join(","),
      indexNumber: mapped.indexNumber,
      courseCode: mapped.courseCode,
      semester: mapped.semester,
      year: mapped.year,
      grade: mapped.grade,
    };
  });

  return {
    rows,
    missingHeaders,
    unknownHeaders,
    totalDataRows: nonEmptyData.length,
  };
}
