CREATE TABLE `kharajah` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admission_number` text NOT NULL,
	`name` text NOT NULL,
	`date_of_birth` text NOT NULL,
	`gender` text NOT NULL,
	`section` text NOT NULL,
	`expected_fees` text NOT NULL,
	`admitted_on` text DEFAULT '' NOT NULL,
	`admission_fee_collected` integer DEFAULT false NOT NULL,
	`admission_fee_amount` text DEFAULT '0.00' NOT NULL,
	`fees_paid` text DEFAULT '0.00' NOT NULL,
	`guardian_name` text NOT NULL,
	`guardian_phone` text NOT NULL,
	`guardian_email` text NOT NULL,
	`second_contact_name` text,
	`second_contact_phone` text,
	`second_contact_email` text,
	`left_on` text NOT NULL,
	`leave_reason` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `kharajah_left_on_idx` ON `kharajah` (`left_on`);
