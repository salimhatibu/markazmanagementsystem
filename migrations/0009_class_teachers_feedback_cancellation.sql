ALTER TABLE `school_classes` ADD `teacher_id` integer REFERENCES `teachers`(`id`) ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `school_classes` ADD `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;
--> statement-breakpoint
ALTER TABLE `feedback_tickets` ADD `cancelled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `feedback_tickets` ADD `cancelled_at` text;
--> statement-breakpoint
DROP INDEX `feedback_tickets_done_idx`;
--> statement-breakpoint
CREATE INDEX `feedback_tickets_done_idx` ON `feedback_tickets` (`done`, `cancelled`, `created_at`);
