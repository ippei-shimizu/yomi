CREATE TABLE `item_tags` (
	`item_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`item_id`, `tag_id`),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`original_url` text NOT NULL,
	`url_hash` text NOT NULL,
	`source` text NOT NULL,
	`title` text,
	`description` text,
	`thumbnail_url` text,
	`site_name` text,
	`author` text,
	`status` text DEFAULT 'unread' NOT NULL,
	`meta_status` text DEFAULT 'pending' NOT NULL,
	`meta_retry_count` integer DEFAULT 0 NOT NULL,
	`memo` text,
	`snoozed_until` integer,
	`saved_at` integer NOT NULL,
	`read_at` integer,
	`archived_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `items_url_hash_unique` ON `items` (`url_hash`);--> statement-breakpoint
CREATE INDEX `idx_items_status_saved` ON `items` (`status`,`saved_at`);--> statement-breakpoint
CREATE INDEX `idx_items_meta_status` ON `items` (`meta_status`);--> statement-breakpoint
CREATE TABLE `read_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`event` text NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_read_logs_at` ON `read_logs` (`at`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);