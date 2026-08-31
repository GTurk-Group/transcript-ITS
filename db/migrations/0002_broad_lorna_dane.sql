DROP INDEX "rate_limit_attempts_key_idx";--> statement-breakpoint
ALTER TABLE "programmes" ALTER COLUMN "programme_type" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "programmes" ALTER COLUMN "programme_type" SET DEFAULT 'DEGREE';--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "gender" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "student_type" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "student_type" SET DEFAULT 'UNDERGRADUATE';--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "entry_year" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "graduation_year" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "transcripts" ADD COLUMN "error_message" text;--> statement-breakpoint
CREATE INDEX "rate_limit_key_idx" ON "rate_limit_attempts" USING btree ("key","created_at");--> statement-breakpoint
CREATE INDEX "transcripts_created_at_idx" ON "transcripts" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "is_Resit";--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" DROP COLUMN "ip_address";--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" DROP COLUMN "endpoint";--> statement-breakpoint
ALTER TABLE "rate_limit_attempts" DROP COLUMN "method";--> statement-breakpoint
DROP TYPE "public"."student_type";