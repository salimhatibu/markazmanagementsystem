-- One impression, click, view, or dwell per device per paper.
-- Keep the longer reading time when an older pair of rows exists.
DELETE FROM "blog_events" AS extra
USING "blog_events" AS kept
WHERE extra.post_id = kept.post_id
	AND extra.session_id = kept.session_id
	AND extra.kind = kept.kind
	AND (
		COALESCE(extra.dwell_ms, -1) < COALESCE(kept.dwell_ms, -1)
		OR (
			COALESCE(extra.dwell_ms, -1) = COALESCE(kept.dwell_ms, -1)
			AND extra.id > kept.id
		)
	);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "blog_events_device_kind_unique" ON "blog_events" USING btree ("post_id","session_id","kind");
