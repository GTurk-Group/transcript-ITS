ALTER TABLE "grades" ALTER COLUMN "grade" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."grade";--> statement-breakpoint
CREATE TYPE "public"."grade" AS ENUM('A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E', 'IC');--> statement-breakpoint
ALTER TABLE "grades" ALTER COLUMN "grade" SET DATA TYPE "public"."grade" USING "grade"::"public"."grade";