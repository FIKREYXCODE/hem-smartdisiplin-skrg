CREATE TABLE `discipline_organization_members` (
	`id` text PRIMARY KEY NOT NULL,
	`academic_year` integer NOT NULL,
	`teacher_id` text,
	`display_name` text NOT NULL,
	`position` text NOT NULL,
	`level` text NOT NULL,
	`session` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`image_key` text,
	`image_content_type` text,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`academic_year`) REFERENCES `discipline_organization_years`(`year`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_discipline_org_year_level` ON `discipline_organization_members` (`academic_year`,`level`);--> statement-breakpoint
CREATE INDEX `idx_discipline_org_session_order` ON `discipline_organization_members` (`academic_year`,`session`,`sort_order`);--> statement-breakpoint
CREATE TABLE `discipline_organization_years` (
	`year` integer PRIMARY KEY NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `classes` ADD `academic_year` integer DEFAULT 2026 NOT NULL;--> statement-breakpoint
ALTER TABLE `classes` ADD `class_teacher_id` text;--> statement-breakpoint
CREATE INDEX `idx_classes_academic_year` ON `classes` (`academic_year`);
--> statement-breakpoint
INSERT OR IGNORE INTO `discipline_organization_years` (`year`,`active`,`created_at`,`updated_at`) VALUES (2026,1,datetime('now'),datetime('now'));
--> statement-breakpoint
INSERT OR IGNORE INTO `discipline_organization_members` (`id`,`academic_year`,`display_name`,`position`,`level`,`session`,`sort_order`,`active`,`created_at`,`updated_at`) VALUES
('org-2026-guru-besar',2026,'Belum ditetapkan','Guru Besar','guru_besar',NULL,1,1,datetime('now'),datetime('now')),
('org-2026-pk-hem',2026,'Belum ditetapkan','Penolong Kanan Hal Ehwal Murid','pk_hem',NULL,1,1,datetime('now'),datetime('now')),
('org-2026-setiausaha',2026,'Puan Norlina','Setiausaha Disiplin','setiausaha',NULL,1,1,datetime('now'),datetime('now')),
('org-2026-pagi-nozi',2026,'Nozi','Guru Disiplin','sidang','Pagi',1,1,datetime('now'),datetime('now')),
('org-2026-pagi-faizal',2026,'Faizal','Guru Disiplin','sidang','Pagi',2,1,datetime('now'),datetime('now')),
('org-2026-petang-wafa',2026,'Wafa','Guru Disiplin','sidang','Petang',1,1,datetime('now'),datetime('now')),
('org-2026-petang-zamri',2026,'Zamri','Guru Disiplin','sidang','Petang',2,1,datetime('now'),datetime('now'));
