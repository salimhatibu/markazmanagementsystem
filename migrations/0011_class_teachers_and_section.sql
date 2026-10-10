CREATE TABLE `class_teachers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_id` integer NOT NULL REFERENCES `school_classes`(`id`) ON DELETE cascade,
	`teacher_id` integer NOT NULL REFERENCES `teachers`(`id`) ON DELETE cascade,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `class_teachers_class_teacher_uid` ON `class_teachers` (`class_id`,`teacher_id`);
--> statement-breakpoint
CREATE INDEX `class_teachers_class_idx` ON `class_teachers` (`class_id`);
--> statement-breakpoint
CREATE INDEX `class_teachers_teacher_idx` ON `class_teachers` (`teacher_id`);
--> statement-breakpoint
INSERT INTO `class_teachers` (`class_id`, `teacher_id`, `created_at`)
SELECT `id`, `teacher_id`, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM `school_classes` WHERE `teacher_id` IS NOT NULL;
--> statement-breakpoint
ALTER TABLE `school_classes` DROP COLUMN `teacher_id`;
--> statement-breakpoint
ALTER TABLE `school_classes` ADD `section` text DEFAULT 'morning' NOT NULL;
