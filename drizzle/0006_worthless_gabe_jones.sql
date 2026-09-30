CREATE TABLE `access_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`actor_name` text NOT NULL,
	`event_type` text NOT NULL,
	`target_user_id` text,
	`details` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_access_audit_created` ON `access_audit` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_access_audit_user` ON `access_audit` (`user_id`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_token_hash` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_user_expires` ON `auth_sessions` (`user_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `user_accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`password_hash` text,
	`password_salt` text,
	`password_iterations` integer DEFAULT 210000 NOT NULL,
	`password_set_at` text,
	`reset_at` text,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_user_accounts_active` ON `user_accounts` (`active`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`scope_id` text,
	`position` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text DEFAULT 'system' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_user_roles_user_role` ON `user_roles` (`user_id`,`role`);--> statement-breakpoint
CREATE INDEX `idx_user_roles_role_scope` ON `user_roles` (`role`,`scope_id`);--> statement-breakpoint
ALTER TABLE `cases` ADD `admin_review_requested` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `cases` ADD `admin_review_requested_at` text;--> statement-breakpoint
ALTER TABLE `discipline_actions` ADD `action_date` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `discipline_actions` ADD `action_time` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `discipline_actions` ADD `additional_notes` text DEFAULT '' NOT NULL;