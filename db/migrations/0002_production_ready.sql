-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0002 — Production-ready schema additions
-- Run with: psql $DATABASE_URL -f db/migrations/0002_production_ready.sql
-- All statements are idempotent (IF NOT EXISTS / IF EXISTS guards).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add date_of_birth to students (was referenced in transcript but missing)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- 2. Add gender to students (referenced in transcript template)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- 3. Ensure the partial unique index on grades exists.
--    This enforces one active (non-superseded) grade per student+course+semester.
--    The CREATE TABLE in 0001 defined it, but if the DB was pushed before it was
--    added to the schema this index may be absent.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'grades'
      AND indexname = 'unique_active_student_course_semester'
  ) THEN
    CREATE UNIQUE INDEX unique_active_student_course_semester
      ON grades (student_id, course_id, semester_id)
      WHERE is_superseded = false;
  END IF;
END $$;

-- 4. Index on transcripts.created_at for fast history panel queries
CREATE INDEX IF NOT EXISTS transcripts_created_at_idx
  ON transcripts (created_at DESC);

-- 5. Index on grades.is_superseded for correction queries
CREATE INDEX IF NOT EXISTS grades_is_superseded_idx
  ON grades (is_superseded)
  WHERE is_superseded = false;

-- 6. Add self-referential FK on grades.superseded_by_id (was left as plain UUID)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'grades_superseded_by_id_fk'
  ) THEN
    ALTER TABLE grades
      ADD CONSTRAINT grades_superseded_by_id_fk
      FOREIGN KEY (superseded_by_id) REFERENCES grades(id);
  END IF;
END $$;

-- 7. Add failed_at and error_message to transcripts for async generation tracking
ALTER TABLE transcripts
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 8. Rate limiting table (used by login rate limiter — no Redis required)
CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(255) NOT NULL,   -- e.g. "login:ip:1.2.3.4"
  created_at  TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_key_idx ON rate_limit_attempts (key, created_at);

-- Auto-clean entries older than 1 hour (keep the table small)
-- Run this periodically via pg_cron or a scheduled job:
-- DELETE FROM rate_limit_attempts WHERE created_at < now() - INTERVAL '1 hour';
