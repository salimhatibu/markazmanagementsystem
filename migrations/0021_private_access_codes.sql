ALTER TABLE `posts` ADD `access_code` text;
--> statement-breakpoint
UPDATE `posts` SET `access_code` = upper(substr(hex(randomblob(8)), 1, 6)) WHERE `visibility` = 'private' AND `access_code` IS NULL;
