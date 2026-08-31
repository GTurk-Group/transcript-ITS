CREATE TYPE "grade" AS ENUM('A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E', 'IC');--> statement-breakpoint
CREATE TYPE "role" AS ENUM('SUPER_ADMIN', 'ADMIN', 'VIEWER');--> statement-breakpoint
CREATE TYPE "semester" AS ENUM('FIRST', 'SECOND');--> statement-breakpoint
CREATE TYPE "student_status" AS ENUM('ACTIVE', 'GRADUATED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "transcript_status" AS ENUM('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "upload_job_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"role" "role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"admin_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity" varchar(100) NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"ip_address" varchar(100),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"credit_hours" integer NOT NULL,
	"is_scoring" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"semester_id" uuid NOT NULL,
	"grade" "grade" NOT NULL,
	"grade_point" numeric(3,2) NOT NULL,
	"credit_hours" integer NOT NULL,
	"computed_quality_points" numeric(6,2) NOT NULL,
	"is_resit" boolean DEFAULT false NOT NULL,
	"is_superseded" boolean DEFAULT false NOT NULL,
	"superseded_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"address" text,
	"logo_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programmes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"programme_type" varchar(20) DEFAULT 'DEGREE' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"key" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"signature_path" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semesters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"year" integer NOT NULL,
	"semester" "semester" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"index_number" varchar(100) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"middle_name" varchar(100),
	"last_name" varchar(100) NOT NULL,
	"student_type" varchar(20) DEFAULT 'UNDERGRADUATE' NOT NULL,
	"date_of_birth" date,
	"gender" varchar(10),
	"programme_id" uuid NOT NULL,
	"level" integer NOT NULL,
	"entry_year" integer NOT NULL,
	"graduation_year" integer,
	"status" "student_status" DEFAULT 'ACTIVE'::"student_status" NOT NULL,
	"email" varchar(255),
	"phone_number" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"student_id" uuid NOT NULL,
	"transcript_number" varchar(100) NOT NULL,
	"generated_by" uuid NOT NULL,
	"file_key" text,
	"checksum" varchar(64),
	"status" "transcript_status" DEFAULT 'COMPLETED'::"transcript_status",
	"registrar_id" uuid,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_job_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"job_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"row_data" jsonb NOT NULL,
	"error_code" varchar(100),
	"error_message" text,
	"is_valid" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"admin_id" uuid NOT NULL,
	"file_key" text NOT NULL,
	"job_type" varchar(50) NOT NULL,
	"status" "upload_job_status" DEFAULT 'PENDING'::"upload_job_status" NOT NULL,
	"total_rows" integer,
	"processed_rows" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_unique" ON "admins" ("email");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_admin_idx" ON "audit_logs" ("admin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_code_unique" ON "courses" ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_active_student_course_semester" ON "grades" ("student_id","course_id","semester_id") WHERE is_superseded = false;--> statement-breakpoint
CREATE INDEX "grades_student_idx" ON "grades" ("student_id");--> statement-breakpoint
CREATE INDEX "grades_semester_idx" ON "grades" ("semester_id");--> statement-breakpoint
CREATE INDEX "grades_student_semester_idx" ON "grades" ("student_id","semester_id");--> statement-breakpoint
CREATE UNIQUE INDEX "programmes_name_unique" ON "programmes" ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "programmes_code_unique" ON "programmes" ("code");--> statement-breakpoint
CREATE INDEX "rate_limit_key_idx" ON "rate_limit_attempts" ("key","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_year_semester" ON "semesters" ("year","semester");--> statement-breakpoint
CREATE UNIQUE INDEX "students_index_unique" ON "students" ("index_number");--> statement-breakpoint
CREATE UNIQUE INDEX "transcript_number_unique" ON "transcripts" ("transcript_number");--> statement-breakpoint
CREATE INDEX "transcripts_student_idx" ON "transcripts" ("student_id");--> statement-breakpoint
CREATE INDEX "transcripts_created_at_idx" ON "transcripts" ("created_at");--> statement-breakpoint
CREATE INDEX "upload_job_rows_job_idx" ON "upload_job_rows" ("job_id");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_admins_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_id_students_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id");--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_course_id_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id");--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_semester_id_semesters_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id");--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_programme_id_programmes_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id");--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_student_id_students_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id");--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_generated_by_admins_id_fkey" FOREIGN KEY ("generated_by") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_registrar_id_registrar_id_fkey" FOREIGN KEY ("registrar_id") REFERENCES "registrar"("id");--> statement-breakpoint
ALTER TABLE "upload_job_rows" ADD CONSTRAINT "upload_job_rows_job_id_upload_jobs_id_fkey" FOREIGN KEY ("job_id") REFERENCES "upload_jobs"("id");--> statement-breakpoint
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_admin_id_admins_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id");