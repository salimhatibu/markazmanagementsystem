ALTER TABLE "teachers" ADD COLUMN "phone" varchar(64);
--> statement-breakpoint
ALTER TABLE "teachers" ADD COLUMN "national_id" varchar(64);
--> statement-breakpoint
ALTER TABLE "teachers" ADD COLUMN "mpesa_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "teachers" ADD COLUMN "mpesa_number" varchar(64);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "address" varchar(255);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "account_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "bank_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "paybill" varchar(32);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "account_number" varchar(64);
