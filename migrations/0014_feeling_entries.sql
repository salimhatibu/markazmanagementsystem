CREATE TABLE `feeling_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`mood` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `feeling_entries_email_idx` ON `feeling_entries` (`email`,`created_at`);
