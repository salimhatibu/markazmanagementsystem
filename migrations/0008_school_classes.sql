CREATE TABLE `school_classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `school_classes_name_unique` ON `school_classes` (`name`);
--> statement-breakpoint
ALTER TABLE `students` ADD `class_id` integer REFERENCES `school_classes`(`id`) ON DELETE set null;
