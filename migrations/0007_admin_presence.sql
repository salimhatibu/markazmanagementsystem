CREATE TABLE `admin_presence` (
	`email` text PRIMARY KEY NOT NULL,
	`name` text,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_presence_last_seen_idx` ON `admin_presence` (`last_seen_at`);
