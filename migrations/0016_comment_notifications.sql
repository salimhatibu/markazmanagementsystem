PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text DEFAULT 'report' NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`report_id` integer,
	`post_id` integer,
	`read_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_notifications`("id", "kind", "title", "body", "report_id", "post_id", "read_at", "created_at")
SELECT "id", 'report', "title", NULL, "report_id", NULL, "read_at", "created_at" FROM `notifications`;
--> statement-breakpoint
DROP TABLE `notifications`;
--> statement-breakpoint
ALTER TABLE `__new_notifications` RENAME TO `notifications`;
--> statement-breakpoint
CREATE INDEX `notifications_kind_idx` ON `notifications` (`kind`,`read_at`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
