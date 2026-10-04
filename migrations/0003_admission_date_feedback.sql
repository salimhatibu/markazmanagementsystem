ALTER TABLE `students` ADD `admitted_on` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE `students` SET `admitted_on` = substr(`created_at`, 1, 10) WHERE `admitted_on` = '' OR `admitted_on` IS NULL;
--> statement-breakpoint
CREATE TABLE `feedback_tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text DEFAULT 'query' NOT NULL,
	`body` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`done_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `feedback_tickets_done_idx` ON `feedback_tickets` (`done`,`created_at`);
