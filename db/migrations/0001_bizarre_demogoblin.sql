CREATE TYPE "public"."student_type" AS ENUM('UNDERGRADUATE', 'POSTGRADUATE');--> statement-breakpoint
DROP INDEX "grades_is_superseded_idx";--> statement-breakpoint
DROP INDEX "rate_limit_key_idx";--> statement-breakpoint
DROP INDEX "transcripts_created_at_idx";--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "gender" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "entry_year" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "is_Resit" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "grades" ADD COLUMN "is_resit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "programmes" ADD COLUMN "programme_type" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" ADD COLUMN "ip_address" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" ADD COLUMN "endpoint" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" ADD COLUMN "method" varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "middle_name" varchar(100);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "student_type" "student_type" DEFAULT 'UNDERGRADUATE' NOT NULL;--> statement-breakpoint
CREATE INDEX "rate_limit_attempts_key_idx" ON "rate_limit_attempts" USING btree ("key");--> statement-breakpoint
ALTER TABLE "transcripts" DROP COLUMN "error_message";