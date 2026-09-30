CREATE TABLE IF NOT EXISTS "series" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(80) NOT NULL,
	"title" varchar(120) NOT NULL,
	"blurb" varchar(400),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "series_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email"),
	CONSTRAINT "newsletter_subscribers_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "series_id" integer;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "posts" ADD CONSTRAINT "posts_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_series_idx" ON "posts" USING btree ("series_id");
--> statement-breakpoint
INSERT INTO "series" ("slug", "title", "blurb")
VALUES
	('marriage', 'Marriage', 'Nikah, the household, and the rights between spouses.'),
	('modesty', 'Modesty', 'Haya, dress, and lowering the gaze.'),
	('worship', 'Worship', 'Salah, supplication, and the heart in obedience.')
ON CONFLICT ("slug") DO NOTHING;
