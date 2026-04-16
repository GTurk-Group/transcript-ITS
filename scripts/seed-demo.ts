#!/usr/bin/env tsx
/**
 * Seed demonstration data for local development.
 *
 * Creates:
 *   - 1 institution record
 *   - 1 registrar
 *   - 2 programmes (BSc Computer Science, BSc Engineering)
 *   - 8 courses across both programmes
 *   - 4 semesters (2 academic years)
 *   - 4 students
 *   - 24 grade records (6 per student across 4 semesters)
 *
 * Usage:  pnpm seed:demo
 * Safe:   Checks for existence before inserting — skip if already present.
 * Requires a SUPER_ADMIN to already exist (run seed:admin first).
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

import { db }                   from "../db";
import { institution, registrar, programmes, courses, semesters, students, grades, admins } from "../db/schema";
import { eq, and }              from "drizzle-orm";
import { resolveGradePoint, computeQualityPoints } from "../lib/gpa/scale";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function insertIfAbsent<T extends { id: string }>(
  table: Parameters<typeof db.insert>[0],
  values: object,
  checkQuery: () => Promise<{ id: string }[]>,
  label: string
): Promise<string> {
  const existing = await checkQuery();
  if (existing.length > 0) {
    console.log(`  skip  ${label} (already exists, id=${existing[0].id.slice(0, 8)})`);
    return existing[0].id;
  }
  const [row] = await (db.insert(table as any).values(values as any).returning({ id: (table as any).id })) as { id: string }[];
  console.log(`  ✓     ${label} (id=${row.id.slice(0, 8)})`);
  return row.id;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n── Seeding demo data ──────────────────────────────────────\n");

  // ── Require an existing admin for foreign key on grades/transcripts ────────
  const adminRows = await db.select({ id: admins.id }).from(admins).limit(1);
  if (adminRows.length === 0) {
    console.error("No admin found. Run `pnpm seed:admin` first.");
    process.exit(1);
  }

  // ── 1. Institution ─────────────────────────────────────────────────────────

  console.log("Institution:");
  const institutionRows = await db.select({ id: institution.id }).from(institution).limit(1);
  let institutionId: string;
  if (institutionRows.length > 0) {
    institutionId = institutionRows[0].id;
    console.log(`  skip  Institution (already exists)`);
  } else {
    const [inst] = await db.insert(institution).values({
      name:    "University of Technology",
      address: "P.O. Box 123, Accra, Ghana",
    }).returning({ id: institution.id });
    institutionId = inst.id;
    console.log(`  ✓     University of Technology`);
  }

  // ── 2. Registrar ───────────────────────────────────────────────────────────

  console.log("\nRegistrar:");
  const regRows = await db.select({ id: registrar.id }).from(registrar).where(eq(registrar.isActive, true)).limit(1);
  if (regRows.length === 0) {
    await db.insert(registrar).values({
      name:     "Dr. Kofi Acheampong",
      title:    "University Registrar",
      isActive: true,
    });
    console.log(`  ✓     Dr. Kofi Acheampong — Registrar`);
  } else {
    console.log(`  skip  Registrar (already exists)`);
  }

  // ── 3. Programmes ──────────────────────────────────────────────────────────

  console.log("\nProgrammes:");

  const PROGRAMMES = [
    { name: "Bachelor of Science in Computer Science", code: "BSC-CS" },
    { name: "Bachelor of Science in Engineering",      code: "BSC-ENG" },
  ];

  const programmeIds: Record<string, string> = {};
  for (const p of PROGRAMMES) {
    const existing = await db.select({ id: programmes.id }).from(programmes).where(eq(programmes.code, p.code)).limit(1);
    if (existing.length > 0) {
      programmeIds[p.code] = existing[0].id;
      console.log(`  skip  ${p.code}`);
    } else {
      const [row] = await db.insert(programmes).values(p).returning({ id: programmes.id });
      programmeIds[p.code] = row.id;
      console.log(`  ✓     ${p.code} — ${p.name}`);
    }
  }

  // ── 4. Courses ─────────────────────────────────────────────────────────────

  console.log("\nCourses:");

  const COURSES = [
    { code: "MATH101", title: "Calculus I",                  creditHours: 3 },
    { code: "PHYS101", title: "Mechanics",                   creditHours: 3 },
    { code: "COMP101", title: "Introduction to Programming", creditHours: 3 },
    { code: "MATH201", title: "Linear Algebra",              creditHours: 3 },
    { code: "COMP201", title: "Data Structures",             creditHours: 3 },
    { code: "COMP202", title: "Algorithms",                  creditHours: 3 },
    { code: "ENG101",  title: "Engineering Drawing",         creditHours: 2 },
    { code: "GEN001",  title: "Communication Skills",        creditHours: 2, isScoring: false },
  ];

  const courseIds: Record<string, string> = {};
  for (const c of COURSES) {
    const existing = await db.select({ id: courses.id }).from(courses).where(eq(courses.code, c.code)).limit(1);
    if (existing.length > 0) {
      courseIds[c.code] = existing[0].id;
      console.log(`  skip  ${c.code}`);
    } else {
      const [row] = await db.insert(courses).values({
        code:        c.code,
        title:       c.title,
        creditHours: c.creditHours,
        isScoring:   c.isScoring ?? true,
        isActive:    true,
      }).returning({ id: courses.id });
      courseIds[c.code] = row.id;
      const scoring = (c.isScoring ?? true) ? "" : " (non-scoring)";
      console.log(`  ✓     ${c.code} — ${c.title}${scoring}`);
    }
  }

  // ── 5. Semesters ───────────────────────────────────────────────────────────

  console.log("\nSemesters:");

  const SEMESTERS: { year: number; semester: "FIRST" | "SECOND"; label: string }[] = [
    { year: 2022, semester: "FIRST",  label: "2022/2023 First" },
    { year: 2022, semester: "SECOND", label: "2022/2023 Second" },
    { year: 2023, semester: "FIRST",  label: "2023/2024 First" },
    { year: 2023, semester: "SECOND", label: "2023/2024 Second" },
  ];

  const semesterIds: Record<string, string> = {};
  for (const s of SEMESTERS) {
    const existing = await db
      .select({ id: semesters.id })
      .from(semesters)
      .where(and(eq(semesters.year, s.year), eq(semesters.semester, s.semester)))
      .limit(1);

    const key = `${s.year}-${s.semester}`;
    if (existing.length > 0) {
      semesterIds[key] = existing[0].id;
      console.log(`  skip  ${s.label}`);
    } else {
      const [row] = await db.insert(semesters).values({ year: s.year, semester: s.semester }).returning({ id: semesters.id });
      semesterIds[key] = row.id;
      console.log(`  ✓     ${s.label}`);
    }
  }

  // ── 6. Students ────────────────────────────────────────────────────────────

  console.log("\nStudents:");

  const STUDENTS = [
    { indexNumber: "CS/2022/001", firstName: "Ama",    lastName: "Mensah",   programmeCode: "BSC-CS",  level: 200, entryYear: 2022 },
    { indexNumber: "CS/2022/002", firstName: "Kofi",   lastName: "Asante",   programmeCode: "BSC-CS",  level: 200, entryYear: 2022 },
    { indexNumber: "ENG/2022/001",firstName: "Abena",  lastName: "Owusu",    programmeCode: "BSC-ENG", level: 200, entryYear: 2022 },
    { indexNumber: "CS/2021/005", firstName: "Kwame",  lastName: "Boateng",  programmeCode: "BSC-CS",  level: 300, entryYear: 2021 },
  ];

  const studentIds: Record<string, string> = {};
  for (const s of STUDENTS) {
    const existing = await db.select({ id: students.id }).from(students).where(eq(students.indexNumber, s.indexNumber)).limit(1);
    if (existing.length > 0) {
      studentIds[s.indexNumber] = existing[0].id;
      console.log(`  skip  ${s.indexNumber}`);
    } else {
      const [row] = await db.insert(students).values({
        indexNumber: s.indexNumber,
        firstName:   s.firstName,
        lastName:    s.lastName,
        programmeId: programmeIds[s.programmeCode],
        level:       s.level,
        entryYear:   s.entryYear,
        status:      "ACTIVE",
      }).returning({ id: students.id });
      studentIds[s.indexNumber] = row.id;
      console.log(`  ✓     ${s.indexNumber} — ${s.firstName} ${s.lastName}`);
    }
  }

  // ── 7. Grades ──────────────────────────────────────────────────────────────

  console.log("\nGrades:");

  type GradeEntry = { studentIdx: string; courseCode: string; semKey: string; grade: string };

  // Varied grade patterns across students for a realistic GPA spread
  const GRADE_ENTRIES: GradeEntry[] = [
    // Ama Mensah — First Class trajectory
    { studentIdx: "CS/2022/001", courseCode: "MATH101", semKey: "2022-FIRST",  grade: "A"  },
    { studentIdx: "CS/2022/001", courseCode: "PHYS101", semKey: "2022-FIRST",  grade: "B+" },
    { studentIdx: "CS/2022/001", courseCode: "COMP101", semKey: "2022-FIRST",  grade: "A"  },
    { studentIdx: "CS/2022/001", courseCode: "MATH201", semKey: "2022-SECOND", grade: "A"  },
    { studentIdx: "CS/2022/001", courseCode: "COMP201", semKey: "2022-SECOND", grade: "B+" },
    { studentIdx: "CS/2022/001", courseCode: "GEN001",  semKey: "2022-SECOND", grade: "A"  },

    // Kofi Asante — Second Class Upper
    { studentIdx: "CS/2022/002", courseCode: "MATH101", semKey: "2022-FIRST",  grade: "B+" },
    { studentIdx: "CS/2022/002", courseCode: "PHYS101", semKey: "2022-FIRST",  grade: "B"  },
    { studentIdx: "CS/2022/002", courseCode: "COMP101", semKey: "2022-FIRST",  grade: "B+" },
    { studentIdx: "CS/2022/002", courseCode: "MATH201", semKey: "2022-SECOND", grade: "B"  },
    { studentIdx: "CS/2022/002", courseCode: "COMP201", semKey: "2022-SECOND", grade: "B+" },
    { studentIdx: "CS/2022/002", courseCode: "GEN001",  semKey: "2022-SECOND", grade: "B"  },

    // Abena Owusu — Engineering student
    { studentIdx: "ENG/2022/001", courseCode: "MATH101", semKey: "2022-FIRST",  grade: "A"  },
    { studentIdx: "ENG/2022/001", courseCode: "ENG101",  semKey: "2022-FIRST",  grade: "B+" },
    { studentIdx: "ENG/2022/001", courseCode: "PHYS101", semKey: "2022-FIRST",  grade: "B+" },
    { studentIdx: "ENG/2022/001", courseCode: "MATH201", semKey: "2022-SECOND", grade: "A"  },
    { studentIdx: "ENG/2022/001", courseCode: "COMP101", semKey: "2022-SECOND", grade: "B"  },
    { studentIdx: "ENG/2022/001", courseCode: "GEN001",  semKey: "2022-SECOND", grade: "B+" },

    // Kwame Boateng — Third-year student, more semesters
    { studentIdx: "CS/2021/005", courseCode: "MATH101", semKey: "2022-FIRST",  grade: "C+" },
    { studentIdx: "CS/2021/005", courseCode: "COMP101", semKey: "2022-FIRST",  grade: "B"  },
    { studentIdx: "CS/2021/005", courseCode: "PHYS101", semKey: "2022-FIRST",  grade: "C"  },
    { studentIdx: "CS/2021/005", courseCode: "COMP201", semKey: "2022-SECOND", grade: "B+" },
    { studentIdx: "CS/2021/005", courseCode: "COMP202", semKey: "2023-FIRST",  grade: "B"  },
    { studentIdx: "CS/2021/005", courseCode: "MATH201", semKey: "2023-SECOND", grade: "B+" },
  ];

  let gradeInserted = 0;
  let gradeSkipped  = 0;

  for (const entry of GRADE_ENTRIES) {
    const studentId  = studentIds[entry.studentIdx];
    const courseId   = courseIds[entry.courseCode];
    const semesterId = semesterIds[entry.semKey];

    if (!studentId || !courseId || !semesterId) {
      console.log(`  warn  Missing FK for ${entry.studentIdx} / ${entry.courseCode} / ${entry.semKey}`);
      continue;
    }

    // Check for existing grade
    const existing = await db
      .select({ id: grades.id })
      .from(grades)
      .where(and(
        eq(grades.studentId,  studentId),
        eq(grades.courseId,   courseId),
        eq(grades.semesterId, semesterId),
        eq(grades.isSuperseded, false),
      ))
      .limit(1);

    if (existing.length > 0) {
      gradeSkipped++;
      continue;
    }

    // Fetch credit hours from DB (not from local constant — matches production contract)
    const [course] = await db
      .select({ creditHours: courses.creditHours })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    const gradePoint   = resolveGradePoint(entry.grade);
    const creditHours  = course.creditHours;
    const qualityPts   = computeQualityPoints(gradePoint, creditHours);

    await db.insert(grades).values({
      studentId,
      courseId,
      semesterId,
      grade:                 entry.grade as "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "F",
      gradePoint:            gradePoint.toFixed(2),
      creditHours,
      computedQualityPoints: qualityPts.toFixed(2),
      isSuperseded:          false,
    });

    gradeInserted++;
  }

  console.log(`  ✓     ${gradeInserted} grade${gradeInserted !== 1 ? "s" : ""} inserted, ${gradeSkipped} skipped`);

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log("\n── Demo seed complete ──────────────────────────────────────");
  console.log("\nYou can now:");
  console.log("  1. Log in at /login with your admin credentials");
  console.log("  2. View students at /students");
  console.log("  3. Browse grades and generate a transcript at /transcripts");
  console.log("  4. Download grade CSV template at /templates\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("\nDemo seed failed:", err);
  process.exit(1);
});
