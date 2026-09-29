CREATE TABLE IF NOT EXISTS "blog_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"kind" varchar(16) NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"dwell_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blog_events" ADD CONSTRAINT "blog_events_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_events_post_kind_idx" ON "blog_events" USING btree ("post_id","kind");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_events_session_idx" ON "blog_events" USING btree ("session_id","post_id","kind");
