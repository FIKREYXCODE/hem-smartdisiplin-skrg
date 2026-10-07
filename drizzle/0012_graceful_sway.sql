CREATE TABLE `hem_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`date` text NOT NULL,
	`start_time` text DEFAULT '' NOT NULL,
	`end_time` text DEFAULT '' NOT NULL,
	`location` text NOT NULL,
	`coordinator_id` text NOT NULL,
	`coordinator_name` text NOT NULL,
	`target_group` text DEFAULT '' NOT NULL,
	`participant_count` integer DEFAULT 0 NOT NULL,
	`objective` text DEFAULT '' NOT NULL,
	`activities` text DEFAULT '' NOT NULL,
	`impact` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_hem_programs_date` ON `hem_programs` (`date`);--> statement-breakpoint
CREATE INDEX `idx_hem_programs_unit` ON `hem_programs` (`unit`,`date`);--> statement-breakpoint
CREATE INDEX `idx_hem_programs_status` ON `hem_programs` (`status`);--> statement-breakpoint
CREATE TABLE `late_records` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`student_name` text NOT NULL,
	`class_id` text NOT NULL,
	`class_name` text NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`reason` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`duty_teacher_id` text NOT NULL,
	`duty_teacher_name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_late_records_date` ON `late_records` (`date`);--> statement-breakpoint
CREATE INDEX `idx_late_records_student` ON `late_records` (`student_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_late_records_class` ON `late_records` (`class_id`,`date`);