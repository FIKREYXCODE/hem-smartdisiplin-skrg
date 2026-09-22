CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter` text NOT NULL,
	`session` text NOT NULL,
	`class_id` text NOT NULL,
	`class_name` text NOT NULL,
	`student` text NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`category` text NOT NULL,
	`notes` text NOT NULL,
	`initial_action` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'disiplin' NOT NULL,
	`created_at` text NOT NULL,
	`history` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_cases_created_at` ON `cases` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_cases_date` ON `cases` (`date`);--> statement-breakpoint
CREATE INDEX `idx_cases_status` ON `cases` (`status`);