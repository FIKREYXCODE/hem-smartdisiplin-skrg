CREATE TABLE `account_activation_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_activation_token_hash` ON `account_activation_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_activation_user_active` ON `account_activation_tokens` (`user_id`,`expires_at`);--> statement-breakpoint
ALTER TABLE `access_audit` ADD `actor_role` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `discipline_actions` ADD `action_types` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `discipline_actions` ADD `pupil_feedback` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `discipline_actions` ADD `parent_feedback` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `ssdm_requests` ADD `pupil_feedback` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `ssdm_requests` ADD `parent_feedback` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `ssdm_requests` ADD `recorded_at` text;--> statement-breakpoint
ALTER TABLE `ssdm_requests` ADD `recorded_by_id` text;--> statement-breakpoint
ALTER TABLE `ssdm_requests` ADD `recorded_by_name` text;--> statement-breakpoint
ALTER TABLE `user_accounts` ADD `status` text DEFAULT 'needs_setup' NOT NULL;