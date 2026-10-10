PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_teachers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`date_of_birth` text,
	`gender` text NOT NULL,
	`phone` text,
	`national_id` text,
	`mpesa_name` text,
	`mpesa_number` text,
	`expected_salary` text NOT NULL,
	`expected_release_date` text,
	`paid_in_advance` integer DEFAULT false NOT NULL,
	`section` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_teachers`("id", "name", "date_of_birth", "gender", "phone", "national_id", "mpesa_name", "mpesa_number", "expected_salary", "expected_release_date", "paid_in_advance", "section", "created_at", "updated_at")
SELECT "id", "name", "date_of_birth", "gender", "phone", "national_id", "mpesa_name", "mpesa_number", "expected_salary", "expected_release_date", "paid_in_advance", "section", "created_at", "updated_at" FROM `teachers`;
--> statement-breakpoint
DROP TABLE `teachers`;
--> statement-breakpoint
ALTER TABLE `__new_teachers` RENAME TO `teachers`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
