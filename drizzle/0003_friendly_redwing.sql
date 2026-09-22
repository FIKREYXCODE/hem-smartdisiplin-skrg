ALTER TABLE `case_events` ADD `before_data` text;--> statement-breakpoint
ALTER TABLE `case_events` ADD `after_data` text;--> statement-breakpoint
ALTER TABLE `cases` ADD `updated_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `cases` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `cases` ADD `deleted_by` text;--> statement-breakpoint
ALTER TABLE `classes` ADD `class_teacher` text DEFAULT '' NOT NULL;