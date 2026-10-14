ALTER TABLE `notifications` ADD `author` text;
--> statement-breakpoint
CREATE TABLE `notification_reads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`notification_id` integer NOT NULL,
	`email` text NOT NULL,
	`read_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_reads_unique_idx` ON `notification_reads` (`notification_id`,`email`);
--> statement-breakpoint
CREATE INDEX `notification_reads_email_idx` ON `notification_reads` (`email`);
