ALTER TABLE `students` ADD `admission_fee_collected` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `students` ADD `admission_fee_amount` text DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
CREATE TABLE `book_purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`unit_cost` text NOT NULL,
	`quantity` integer NOT NULL,
	`purchased_on` text NOT NULL,
	`expense_id` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `book_purchases_purchased_on_idx` ON `book_purchases` (`purchased_on`);
