CREATE TABLE `case_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`student_id` text,
	`class_id` text NOT NULL,
	`student_name` text NOT NULL,
	`class_name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_case_participants_case` ON `case_participants` (`case_id`);--> statement-breakpoint
CREATE INDEX `idx_case_participants_student` ON `case_participants` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_case_participants_class` ON `case_participants` (`class_id`);