CREATE TABLE IF NOT EXISTS "blog_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "blog_likes" ADD CONSTRAINT "blog_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_comments_post_idx" ON "blog_comments" USING btree ("post_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "blog_likes_post_session_uid" ON "blog_likes" USING btree ("post_id","session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_likes_post_idx" ON "blog_likes" USING btree ("post_id");
