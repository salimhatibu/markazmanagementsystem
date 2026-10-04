CREATE TABLE `book_inventories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`purchased_on` text NOT NULL,
	`stationeries_note` text,
	`stationeries_cost` text,
	`expense_id` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `book_inventories_purchased_on_idx` ON `book_inventories` (`purchased_on`);
--> statement-breakpoint
CREATE TABLE `book_inventory_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inventory_id` integer NOT NULL,
	`name` text NOT NULL,
	`price` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`inventory_id`) REFERENCES `book_inventories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `book_inventory_items_inventory_id_idx` ON `book_inventory_items` (`inventory_id`);
