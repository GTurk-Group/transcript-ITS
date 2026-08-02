/**
 * Database schema — Drizzle ORM.
 *
 * This is the single source of truth for the database structure.
 * Run `pnpm db:push` (dev) or `pnpm db:migrate` (prod) after changes.
 *
 * Schema additions from the integration audit:
 *   - transcripts.fileKey        — S3/local path to the generated PDF
 *   - transcripts.checksum       — SHA-256 of the data payload (tamper detection)
 *   - transcripts.status         — PENDING | GENERATING | COMPLETED | FAILED
 *   - transcripts.registrarId    — which registrar signed the document
 *   - grades.isSuperseded        — soft-delete for grade corrections
 *   - grades.supersededById      — self-referential link to the corrected row
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  numeric,
  uniqueIndex,
  index,
  pgEnum,
  jsonb,
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["SUPER_ADMIN", "ADMIN", "VIEWER"]);

export const semesterEnum = pgEnum("semester", ["FIRST", "SECOND"]);

export const studentStatusEnum = pgEnum("student_status", [
  "ACTIVE",
  "GRADUATED",
  "WITHDRAWN",
]);

export const gradeEnum = pgEnum("grade", [
  "A",
  "B+",
  "B",
  "C+",
  "C",
  "D+",
  "D",
  "F",
]);

export const transcriptStatusEnum = pgEnum("transcript_status", [
  "PENDING",
  "GENERATING",
  "COMPLETED",
  "FAILED",
]);

export const uploadJobStatusEnum = pgEnum("upload_job_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

// ─── Institution ──────────────────────────────────────────────────────────────

export const institution = pgTable("institution", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  logoPath: text("logo_path"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Admins ───────────────────────────────────────────────────────────────────

export const admins = pgTable(
  "admins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    password: text("password").notNull(),
    role: roleEnum("role").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("admins_email_unique").on(table.email)],
);

// ─── Programmes ───────────────────────────────────────────────────────────────

export const programmes = pgTable(
  "programmes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    isActive: boolean("is_active").default(true),
    programmeType: varchar("programme_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    nameUnique: uniqueIndex("programmes_name_unique").on(table.name),
    codeUnique: uniqueIndex("programmes_code_unique").on(table.code),
  }),
);

// ─── Students ─────────────────────────────────────────────────────────────────

export const students = pgTable(
  "students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    indexNumber: varchar("index_number", { length: 100 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    middleName: varchar("middle_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    dateOfBirth: date("date_of_birth"),
    gender: varchar("gender"),
    programmeId: uuid("programme_id")
      .references(() => programmes.id)
      .notNull(),
    level: integer("level").notNull(),
    entryYear: integer("entry_year").notNull(),
    graduationYear: integer("graduation_year"),
    status: studentStatusEnum("status").default("ACTIVE").notNull(),
    // Contact fields — populated via manual entry or bulk upload
    email: varchar("email", { length: 255 }),
    phoneNumber: varchar("phone_number", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    indexUnique: uniqueIndex("students_index_unique").on(table.indexNumber),
  }),
);

// ─── Courses ──────────────────────────────────────────────────────────────────

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    creditHours: integer("credit_hours").notNull(),
    isScoring: boolean("is_scoring").default(true),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    codeUnique: uniqueIndex("courses_code_unique").on(table.code),
  }),
);

// ─── Semesters ────────────────────────────────────────────────────────────────

export const semesters = pgTable(
  "semesters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    year: integer("year").notNull(),
    semester: semesterEnum("semester").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueSemester: uniqueIndex("unique_year_semester").on(
      table.year,
      table.semester,
    ),
  }),
);

// ─── Grades ───────────────────────────────────────────────────────────────────

export const grades = pgTable(
  "grades",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    studentId: uuid("student_id")
      .references(() => students.id)
      .notNull(),
    courseId: uuid("course_id")
      .references(() => courses.id)
      .notNull(),
    semesterId: uuid("semester_id")
      .references(() => semesters.id)
      .notNull(),

    grade: gradeEnum("grade").notNull(),

    // Server-computed at write time — NEVER accepted from client
    gradePoint: numeric("grade_point", { precision: 3, scale: 2 }).notNull(),
    creditHours: integer("credit_hours").notNull(), // snapshot from courses at entry time
    computedQualityPoints: numeric("computed_quality_points", {
      precision: 6,
      scale: 2,
    }).notNull(),

    // Grade correction support — soft supersede, never hard delete
    isSuperseded: boolean("is_superseded").default(false).notNull(),
    supersededById: uuid("superseded_by_id"), // FK to grades.id set after correction row is inserted

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // Only one active grade per (student, course, semester) — partial unique index
    activeGradeUnique: uniqueIndex("unique_active_student_course_semester")
      .on(table.studentId, table.courseId, table.semesterId)
      .where(sql`is_superseded = false`),

    studentIdx: index("grades_student_idx").on(table.studentId),
    semesterIdx: index("grades_semester_idx").on(table.semesterId),
    studentSemesterIdx: index("grades_student_semester_idx").on(
      table.studentId,
      table.semesterId,
    ),
  }),
);

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id")
      .references(() => admins.id)
      .notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    entity: varchar("entity", { length: 100 }).notNull(),
    entityId: uuid("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ipAddress: varchar("ip_address", { length: 100 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // B-tree index for date-range queries on the audit page
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
    adminIdx: index("audit_logs_admin_idx").on(table.adminId),
  }),
);

// ─── Registrar ────────────────────────────────────────────────────────────────

export const registrar = pgTable("registrar", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  signaturePath: text("signature_path"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Transcripts ──────────────────────────────────────────────────────────────

export const transcripts = pgTable(
  "transcripts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .references(() => students.id)
      .notNull(),
    transcriptNumber: varchar("transcript_number", { length: 100 }).notNull(),
    generatedBy: uuid("generated_by")
      .references(() => admins.id)
      .notNull(),

    // PDF storage
    fileKey: text("file_key"), // S3 object key or local .transcripts/ path
    checksum: varchar("checksum", { length: 64 }), // SHA-256 hex of the data payload
    status: transcriptStatusEnum("status").default("COMPLETED"),
    registrarId: uuid("registrar_id").references(() => registrar.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    transcriptUnique: uniqueIndex("transcript_number_unique").on(
      table.transcriptNumber,
    ),
    studentIdx: index("transcripts_student_idx").on(table.studentId),
  }),
);

// ─── Bulk upload jobs ─────────────────────────────────────────────────────────

export const uploadJobs = pgTable("upload_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminId: uuid("admin_id")
    .references(() => admins.id)
    .notNull(),
  fileKey: text("file_key").notNull(),
  jobType: varchar("job_type", { length: 50 }).notNull(), // "STUDENTS" | "GRADES"
  status: uploadJobStatusEnum("status").default("PENDING").notNull(),
  totalRows: integer("total_rows"),
  processedRows: integer("processed_rows").default(0),
  errorCount: integer("error_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const uploadJobRows = pgTable(
  "upload_job_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .references(() => uploadJobs.id)
      .notNull(),
    rowNumber: integer("row_number").notNull(),
    rowData: jsonb("row_data").notNull(),
    errorCode: varchar("error_code", { length: 100 }),
    errorMessage: text("error_message"),
    isValid: boolean("is_valid").default(false).notNull(),
  },
  (table) => ({
    jobIdx: index("upload_job_rows_job_idx").on(table.jobId),
  }),
);

export const rateLimitAttempts = pgTable(
  "rate_limit_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ipAddress: varchar("ip_address", { length: 100 }).notNull(),
    endpoint: varchar("endpoint", { length: 255 }).notNull(),
    method: varchar("method", { length: 10 }).notNull(),
    key: varchar("key", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    keyIdx: index("rate_limit_attempts_key_idx").on(table.key),
  }),
);
