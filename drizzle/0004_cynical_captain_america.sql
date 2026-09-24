CREATE TABLE `case_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`uploaded_by_id` text,
	`uploaded_by_name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_case_attachments_case_id_created_at` ON `case_attachments` (`case_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_case_attachments_object_key` ON `case_attachments` (`object_key`);