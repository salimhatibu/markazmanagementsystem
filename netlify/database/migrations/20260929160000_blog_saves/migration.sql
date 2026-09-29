CREATE TABLE IF NOT EXISTS "blog_saves" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blog_saves" ADD CONSTRAINT "blog_saves_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "blog_saves_post_session_uid" ON "blog_saves" USING btree ("post_id","session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_saves_post_idx" ON "blog_saves" USING btree ("post_id");
