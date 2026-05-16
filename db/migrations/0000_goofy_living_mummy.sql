CREATE TYPE "public"."grade" AS ENUM('A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('SUPER_ADMIN', 'ADMIN', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."semester" AS ENUM('FIRST', 'SECOND');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('ACTIVE', 'GRADUATED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."transcript_status" AS ENUM('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."upload_job_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"role" "role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"credit_hours" integer NOT NULL,
	"is_scoring" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"semester_id" uuid NOT NULL,
	"grade" "grade" NOT NULL,
	"grade_point" numeric(3, 2) NOT NULL,
	"credit_hours" integer NOT NULL,
	"computed_quality_points" numeric(6, 2) NOT NULL,
	"is_superseded" boolean DEFAULT false NOT NULL,
	"superseded_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"logo_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programmes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"signature_path" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semesters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"semester" "semester" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"index_number" varchar(100) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"date_of_birth" date,
	"gender" varchar(10),
	"programme_id" uuid NOT NULL,
	"level" integer NOT NULL,
	"entry_year" integer NOT NULL,
	"graduation_year" varchar,
	"status" "student_status" DEFAULT 'ACTIVE' NOT NULL,
	"email" varchar(255),
	"phone_number" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"transcript_number" varchar(100) NOT NULL,
	"generated_by" uuid NOT NULL,
	"file_key" text,
	"checksum" varchar(64),
	"status" "transcript_status" DEFAULT 'COMPLETED',
	"registrar_id" uuid,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_job_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"row_data" jsonb NOT NULL,
	"error_code" varchar(100),
	"error_message" text,
	"is_valid" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"file_key" text NOT NULL,
	"job_type" varchar(50) NOT NULL,
	"status" "upload_job_status" DEFAULT 'PENDING' NOT NULL,
	"total_rows" integer,
	"processed_rows" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_generated_by_admins_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_registrar_id_registrar_id_fk" FOREIGN KEY ("registrar_id") REFERENCES "public"."registrar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_job_rows" ADD CONSTRAINT "upload_job_rows_job_id_upload_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."upload_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_unique" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_admin_idx" ON "audit_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_code_unique" ON "courses" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_active_student_course_semester" ON "grades" USING btree ("student_id","course_id","semester_id") WHERE is_superseded = false;--> statement-breakpoint
CREATE INDEX "grades_student_idx" ON "grades" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "grades_semester_idx" ON "grades" USING btree ("semester_id");--> statement-breakpoint
CREATE INDEX "grades_student_semester_idx" ON "grades" USING btree ("student_id","semester_id");--> statement-breakpoint
CREATE INDEX "grades_is_superseded_idx" ON "grades" USING btree ("is_superseded");--> statement-breakpoint
CREATE UNIQUE INDEX "programmes_name_unique" ON "programmes" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "programmes_code_unique" ON "programmes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "rate_limit_key_idx" ON "rate_limit_attempts" USING btree ("key","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_year_semester" ON "semesters" USING btree ("year","semester");--> statement-breakpoint
CREATE UNIQUE INDEX "students_index_unique" ON "students" USING btree ("index_number");--> statement-breakpoint
CREATE UNIQUE INDEX "transcript_number_unique" ON "transcripts" USING btree ("transcript_number");--> statement-breakpoint
CREATE INDEX "transcripts_student_idx" ON "transcripts" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "transcripts_created_at_idx" ON "transcripts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "upload_job_rows_job_idx" ON "upload_job_rows" USING btree ("job_id");