CREATE TABLE `daily_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spent_on` text NOT NULL,
	`note` text,
	`expense_id` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `daily_expenses_spent_on_idx` ON `daily_expenses` (`spent_on`);
--> statement-breakpoint
CREATE TABLE `daily_expense_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`daily_id` integer NOT NULL,
	`item` text NOT NULL,
	`cost` text NOT NULL,
	`details` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`daily_id`) REFERENCES `daily_expenses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `daily_expense_items_daily_id_idx` ON `daily_expense_items` (`daily_id`);
