-- ─────────────────────────────────────────────────────────────────────────────
-- TMS Initial Migration
-- Run with: pnpm db:migrate
-- Or apply manually: psql $DATABASE_URL -f db/migrations/0001_initial.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE semester AS ENUM ('FIRST', 'SECOND');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE student_status AS ENUM ('ACTIVE', 'GRADUATED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE grade AS ENUM ('A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transcript_status AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE upload_job_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Institution ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS institution (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  address     TEXT,
  logo_path   TEXT,
  created_at  TIMESTAMP   NOT NULL DEFAULT now()
);

-- ─── Admins ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admins (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL,
  password    TEXT        NOT NULL,
  role        role        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admins_email_unique ON admins (email);

-- ─── Programmes ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS programmes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(50)  NOT NULL,
  is_active   BOOLEAN      DEFAULT true,
  created_at  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS programmes_name_unique ON programmes (name);
CREATE UNIQUE INDEX IF NOT EXISTS programmes_code_unique ON programmes (code);

-- ─── Students ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS students (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  index_number    VARCHAR(100)  NOT NULL,
  first_name      VARCHAR(100)  NOT NULL,
  last_name       VARCHAR(100)  NOT NULL,
  programme_id    UUID          NOT NULL REFERENCES programmes(id),
  level           INTEGER       NOT NULL,
  entry_year      INTEGER       NOT NULL,
  graduation_year INTEGER,
  status          student_status NOT NULL DEFAULT 'ACTIVE',
  email           VARCHAR(255),
  phone_number    VARCHAR(50),
  created_at      TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS students_index_unique ON students (index_number);

-- ─── Courses ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS courses (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code         VARCHAR(50)  NOT NULL,
  title        VARCHAR(255) NOT NULL,
  credit_hours INTEGER      NOT NULL,
  is_scoring   BOOLEAN      DEFAULT true,
  is_active    BOOLEAN      DEFAULT true,
  created_at   TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS courses_code_unique ON courses (code);

-- ─── Semesters ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS semesters (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  year       INTEGER   NOT NULL,
  semester   semester  NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_year_semester ON semesters (year, semester);

-- ─── Grades ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS grades (
  id                      UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              UUID     NOT NULL REFERENCES students(id),
  course_id               UUID     NOT NULL REFERENCES courses(id),
  semester_id             UUID     NOT NULL REFERENCES semesters(id),
  grade                   grade    NOT NULL,
  grade_point             NUMERIC(3,2)  NOT NULL,
  credit_hours            INTEGER  NOT NULL,
  computed_quality_points NUMERIC(6,2)  NOT NULL,
  is_superseded           BOOLEAN  NOT NULL DEFAULT false,
  superseded_by_id        UUID,    -- FK to grades.id (self-ref, set after correction)
  created_at              TIMESTAMP NOT NULL DEFAULT now()
);

-- Partial unique: only one active (non-superseded) grade per student+course+semester
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_student_course_semester
  ON grades (student_id, course_id, semester_id)
  WHERE is_superseded = false;

CREATE INDEX IF NOT EXISTS grades_student_idx          ON grades (student_id);
CREATE INDEX IF NOT EXISTS grades_semester_idx         ON grades (semester_id);
CREATE INDEX IF NOT EXISTS grades_student_semester_idx ON grades (student_id, semester_id);

-- ─── Registrar ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS registrar (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(255) NOT NULL,
  title          VARCHAR(255) NOT NULL,
  signature_path TEXT,
  is_active      BOOLEAN      DEFAULT true,
  created_at     TIMESTAMP    NOT NULL DEFAULT now()
);

-- ─── Transcripts ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transcripts (
  id                UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID               NOT NULL REFERENCES students(id),
  transcript_number VARCHAR(100)       NOT NULL,
  generated_by      UUID               NOT NULL REFERENCES admins(id),
  file_key          TEXT,
  checksum          VARCHAR(64),
  status            transcript_status  DEFAULT 'COMPLETED',
  registrar_id      UUID               REFERENCES registrar(id),
  created_at        TIMESTAMP          NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS transcript_number_unique ON transcripts (transcript_number);
CREATE INDEX IF NOT EXISTS transcripts_student_idx ON transcripts (student_id);

-- ─── Audit Logs ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID         NOT NULL REFERENCES admins(id),
  action      VARCHAR(100) NOT NULL,
  entity      VARCHAR(100) NOT NULL,
  entity_id   UUID,
  before      JSONB,
  after       JSONB,
  ip_address  VARCHAR(100),
  user_agent  TEXT,
  created_at  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_admin_idx      ON audit_logs (admin_id);

-- ─── Bulk Upload Jobs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS upload_jobs (
  id             UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       UUID              NOT NULL REFERENCES admins(id),
  file_key       TEXT              NOT NULL,
  job_type       VARCHAR(50)       NOT NULL,
  status         upload_job_status NOT NULL DEFAULT 'PENDING',
  total_rows     INTEGER,
  processed_rows INTEGER           DEFAULT 0,
  error_count    INTEGER           DEFAULT 0,
  created_at     TIMESTAMP         NOT NULL DEFAULT now(),
  completed_at   TIMESTAMP
);

CREATE TABLE IF NOT EXISTS upload_job_rows (
  id            UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID      NOT NULL REFERENCES upload_jobs(id),
  row_number    INTEGER   NOT NULL,
  row_data      JSONB     NOT NULL,
  error_code    VARCHAR(100),
  error_message TEXT,
  is_valid      BOOLEAN   NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS upload_job_rows_job_idx ON upload_job_rows (job_id);
