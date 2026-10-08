ALTER TABLE `reports` ADD `section` text DEFAULT 'all' NOT NULL;
--> statement-breakpoint
DROP INDEX `reports_period_range_uid`;
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_period_range_section_uid` ON `reports` (`period`, `range_start`, `range_end`, `section`);
