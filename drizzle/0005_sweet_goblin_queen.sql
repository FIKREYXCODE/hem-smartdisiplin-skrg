CREATE TABLE `admin_confirmations` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`decision` text NOT NULL,
	`admin_id` text NOT NULL,
	`admin_name` text NOT NULL,
	`position` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_admin_confirmations_case_created` ON `admin_confirmations` (`case_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `discipline_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`action_type` text NOT NULL,
	`other_action` text DEFAULT '' NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`officer_id` text NOT NULL,
	`officer_name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_discipline_actions_case_created` ON `discipline_actions` (`case_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `ssdm_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`pupil_parent_feedback` text DEFAULT '' NOT NULL,
	`recommendation` text NOT NULL,
	`other_recommendation` text DEFAULT '' NOT NULL,
	`extra_notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_by_id` text NOT NULL,
	`requested_by_name` text NOT NULL,
	`requested_at` text NOT NULL,
	`decided_by_id` text,
	`decided_by_name` text,
	`decided_by_position` text,
	`decided_at` text,
	`admin_notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ssdm_requests_case` ON `ssdm_requests` (`case_id`);--> statement-breakpoint
CREATE INDEX `idx_ssdm_requests_status` ON `ssdm_requests` (`status`);--> statement-breakpoint
ALTER TABLE `cases` ADD `location` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `cases` ADD `traffic_status` text DEFAULT 'red' NOT NULL;