CREATE TYPE "gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "report_period" AS ENUM('biweekly', 'monthly');--> statement-breakpoint
CREATE TYPE "student_section" AS ENUM('morning', 'evening');--> statement-breakpoint
CREATE TYPE "teacher_section" AS ENUM('morning', 'evening', 'both');--> statement-breakpoint
CREATE TABLE "fee_payments" (
	"id" serial PRIMARY KEY,
	"student_id" integer NOT NULL,
	"amount" numeric(12,2) NOT NULL,
	"paid_on" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY,
	"title" varchar(255) NOT NULL,
	"report_id" integer NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY,
	"period" "report_period" NOT NULL,
	"range_start" date NOT NULL,
	"range_end" date NOT NULL,
	"blob_key" varchar(600) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_payments" (
	"id" serial PRIMARY KEY,
	"teacher_id" integer NOT NULL,
	"amount" numeric(12,2) NOT NULL,
	"paid_on" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY,
	"markaz_name" varchar(255),
	"currency_symbol" varchar(16)
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY,
	"admission_number" varchar(64) NOT NULL UNIQUE,
	"name" varchar(255) NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" "gender" NOT NULL,
	"section" "student_section" NOT NULL,
	"expected_fees" numeric(12,2) NOT NULL,
	"guardian_name" varchar(255) NOT NULL,
	"guardian_phone" varchar(64) NOT NULL,
	"guardian_email" varchar(255) NOT NULL,
	"second_contact_name" varchar(255),
	"second_contact_phone" varchar(64),
	"second_contact_email" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" serial PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" "gender" NOT NULL,
	"expected_salary" numeric(12,2) NOT NULL,
	"expected_release_date" date NOT NULL,
	"paid_in_advance" boolean DEFAULT false NOT NULL,
	"section" "teacher_section" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "fee_payments_student_id_idx" ON "fee_payments" ("student_id");--> statement-breakpoint
CREATE INDEX "salary_payments_teacher_id_idx" ON "salary_payments" ("teacher_id");--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_student_id_students_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_report_id_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_teacher_id_teachers_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE;