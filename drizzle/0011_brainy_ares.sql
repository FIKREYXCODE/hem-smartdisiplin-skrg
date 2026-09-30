ALTER TABLE `discipline_organization_members` ADD `unit` text DEFAULT 'Disiplin' NOT NULL;--> statement-breakpoint
ALTER TABLE `discipline_organization_members` ADD `role_label` text DEFAULT 'Ahli Jawatankuasa' NOT NULL;--> statement-breakpoint
ALTER TABLE `discipline_organization_members` ADD `hierarchy_level` integer DEFAULT 4 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_discipline_org_hierarchy_order` ON `discipline_organization_members` (`academic_year`,`hierarchy_level`,`sort_order`);--> statement-breakpoint
UPDATE `discipline_organization_members`
SET `hierarchy_level` = CASE `level`
  WHEN 'guru_besar' THEN 1
  WHEN 'pk_hem' THEN 2
  WHEN 'setiausaha' THEN 3
  WHEN 'penyelaras' THEN 3
  ELSE 4
END,
`unit` = CASE
  WHEN `level` IN ('guru_besar','pk_hem') THEN 'Kepimpinan Sekolah'
  ELSE 'Disiplin'
END,
`role_label` = CASE `level`
  WHEN 'guru_besar' THEN 'Pengerusi Pengurusan HEM'
  WHEN 'pk_hem' THEN 'Ketua Pengurusan HEM'
  WHEN 'setiausaha' THEN 'Setiausaha Disiplin'
  WHEN 'penyelaras' THEN 'Penyelaras Disiplin'
  ELSE 'Guru Disiplin'
END;
