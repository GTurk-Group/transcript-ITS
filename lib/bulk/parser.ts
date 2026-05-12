/**
 * CSV parser — zero dependencies.
 *
 * Handles the full RFC 4180 subset that spreadsheet tools produce:
 *   - Quoted fields (commas and newlines inside quotes are preserved)
 *   - Escaped quotes ("")
 *   - Windows (CRLF) and Unix (LF) line endings
 *   - UTF-8 BOM (Excel adds this when saving CSV)
 *   - Leading/trailing whitespace trimmed from unquoted fields
 *   - Empty trailing columns filled with empty string
 *
 * Returns raw string rows — no coercion, no schema enforcement.
 * Callers validate the data; this function only structures it.
 */

import type {
  RawStudentRow,
  StudentCSVColumn,
  // STUDENT_CSV_COLUMNS,
} from "./types";

// ─── Core parser ─────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of string-array rows.
 * Includes the header row as row[0].
 */
function parseCSV(text: string): string[][] {
  // Strip UTF-8 BOM if present (Excel adds \uFEFF)
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
        // Peek ahead — "" means escaped quote, " followed by , or \n means end
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

    // Not in quotes
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
      // CRLF — skip the \r
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

  // Push the last field and row if not empty
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }

  // Remove trailing empty rows (common when files end with a blank line)
  while (rows.length > 0 && rows[rows.length - 1].every((f) => f === "")) {
    rows.pop();
  }

  return rows;
}

// ─── Header normalisation ─────────────────────────────────────────────────────

/**
 * Normalise a header cell: lowercase, strip non-alphanumeric chars.
 * "Index Number" → "indexnumber", "index_number" → "indexnumber"
 */
function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Map of normalised header → canonical column name.
 * Allows the template headers to be renamed/reformatted by users.
 */
const HEADER_MAP: Record<string, StudentCSVColumn> = {
  indexnumber: "indexNumber",
  index: "indexNumber",
  studentid: "indexNumber",
  firstname: "firstName",
  first: "firstName",
  lastname: "lastName",
  last: "lastName",
  surname: "lastName",
  programmecode: "programmeCode",
  programme: "programmeCode",
  program: "programmeCode",
  programcode: "programmeCode",
  level: "level",
  entryyear: "entryYear",
  year: "entryYear",
  admissionyear: "entryYear",
  graduationyear: "graduationYear",
  gradyear: "graduationYear",
  completionyear: "graduationYear",
};

type ParseResult = {
  rows: RawStudentRow[];
  /** Columns from the CSV that could not be mapped to a known header */
  unknownHeaders: string[];
  /** Canonical columns that were missing entirely from the CSV */
  missingHeaders: StudentCSVColumn[];
  /** Total number of data rows before filtering */
  totalDataRows: number;
};

/**
 * Parse a CSV text and map columns to the student upload schema.
 *
 * @param text   Raw CSV file content (UTF-8 string)
 * @param required Columns that must be present for parsing to proceed.
 *                 Defaults to all except graduationYear.
 */
export function parseStudentCSV(
  text: string,
  required: ReadonlyArray<StudentCSVColumn> = [
    "indexNumber",
    "firstName",
    "lastName",
    "programmeCode",
    "level",
    "entryYear",
  ],
): ParseResult {
  const allRows = parseCSV(text);

  if (allRows.length === 0) {
    return {
      rows: [],
      unknownHeaders: [],
      missingHeaders: [...required] as StudentCSVColumn[],
      totalDataRows: 0,
    };
  }

  const headerRow = allRows[0];
  const dataRows = allRows.slice(1);

  // Map column indices to canonical column names
  const indexToColumn = new Map<number, StudentCSVColumn>();
  const unknownHeaders: string[] = [];

  for (let i = 0; i < headerRow.length; i++) {
    const norm = normaliseHeader(headerRow[i]);
    const canonical = HEADER_MAP[norm];
    if (canonical) {
      indexToColumn.set(i, canonical);
    } else if (headerRow[i].trim() !== "") {
      unknownHeaders.push(headerRow[i]);
    }
  }

  // Detect missing required columns
  const foundColumns = new Set(indexToColumn.values());
  const missingHeaders = required.filter(
    (c) => !foundColumns.has(c),
  ) as StudentCSVColumn[];

  // Convert data rows
  const rows: RawStudentRow[] = dataRows
    .filter((row) => row.some((f) => f.trim() !== "")) // skip blank rows
    .map((row, idx) => {
      const mapped: Partial<Record<StudentCSVColumn, string>> = {};

      indexToColumn.forEach((col, colIdx) => {
        mapped[col] = row[colIdx] ?? "";
      });

      return {
        rowNumber: idx + 2, // +1 for header, +1 for 1-based indexing
        rawLine: row.join(","),
        indexNumber: mapped.indexNumber,
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        dateOfBirth: mapped.dateOfBirth,
        gender: mapped.gender,
        email: mapped.email,
        phoneNumber: mapped.phoneNumber,
        programmeCode: mapped.programmeCode,
        level: mapped.level,
        entryYear: mapped.entryYear,
        graduationYear: mapped.graduationYear,
      } satisfies RawStudentRow;
    });

  return {
    rows,
    unknownHeaders,
    missingHeaders,
    totalDataRows: dataRows.filter((r) => r.some((f) => f.trim() !== ""))
      .length,
  };
}

// ─── Template generator ───────────────────────────────────────────────────────

/**
 * Generate the CSV template as a string.
 * Includes one example row to show the expected format.
 */
export function generateStudentCSVTemplate(): string {
  const headers = [
    "indexNumber",
    "firstName",
    "lastName",
    "dateOfBirth",
    "gender",
    "email",
    "phoneNumber",
    "programmeCode",
    "level",
    "entryYear",
    "graduationYear",
  ].join(",");

  const exampleRow = [
    "CS/2021/001",
    "Ama",
    "Mensah",
    "1995-06-15",
    "Female",
    "ama.mensah@example.com",
    "+233 24 123 4567",
    "BSC-CS",
    "100",
    "2021",
    "", // graduationYear is optional
  ].join(",");

  const notes = [
    "# STUDENT BULK UPLOAD TEMPLATE",
    "# Instructions:",
    "# - Delete these comment rows before uploading",
    "# - graduationYear is optional — leave blank for current students",
    "# - level must be one of: 100 200 300 400 500 600 700 800",
    "# - programmeCode must match an existing programme in the system",
    "# - indexNumber must be unique across all students",
  ]
    .map((line) => line)
    .join("\n");

  return `${notes}\n${headers}\n${exampleRow}\n`;
}
