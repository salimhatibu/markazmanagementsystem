CREATE TABLE `reader_presence` (
	`session_id` text PRIMARY KEY NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reader_presence_last_seen_idx` ON `reader_presence` (`last_seen_at`);
