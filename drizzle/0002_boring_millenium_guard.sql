CREATE TABLE `case_events` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`actor_id` text,
	`actor_name` text NOT NULL,
	`actor_role` text NOT NULL,
	`event_type` text NOT NULL,
	`action` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_case_events_case_id_created_at` ON `case_events` (`case_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `cases` ADD `reporter_id` text;--> statement-breakpoint
ALTER TABLE `cases` ADD `student_id` text;