CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"reason" varchar(255) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"spent_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "expenses_spent_on_idx" ON "expenses" USING btree ("spent_on");
