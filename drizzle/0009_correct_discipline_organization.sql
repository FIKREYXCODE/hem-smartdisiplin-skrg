UPDATE `discipline_organization_members`
SET `teacher_id` = (SELECT `id` FROM `teachers` WHERE `name` = 'NORLINA BINTI BAGWAS' LIMIT 1),
    `display_name` = 'NORLINA BINTI BAGWAS',
    `position` = 'Setiausaha Disiplin',
    `level` = 'setiausaha',
    `session` = NULL,
    `updated_at` = datetime('now')
WHERE `id` = 'org-2026-setiausaha' AND `academic_year` = 2026;
--> statement-breakpoint
UPDATE `discipline_organization_members`
SET `teacher_id` = (SELECT `id` FROM `teachers` WHERE `name` = 'NOZE BINTI TUKIJAN' LIMIT 1),
    `display_name` = 'NOZE BINTI TUKIJAN',
    `position` = 'Penyelaras Disiplin',
    `level` = 'penyelaras',
    `session` = NULL,
    `sort_order` = 1,
    `updated_at` = datetime('now')
WHERE `id` = 'org-2026-pagi-nozi' AND `academic_year` = 2026;
--> statement-breakpoint
UPDATE `discipline_organization_members`
SET `teacher_id` = (SELECT `id` FROM `teachers` WHERE `name` = 'MOHD ALFAIZAL BIN DAUD' LIMIT 1),
    `display_name` = 'MOHD ALFAIZAL BIN DAUD',
    `updated_at` = datetime('now')
WHERE `id` = 'org-2026-pagi-faizal' AND `academic_year` = 2026;
--> statement-breakpoint
UPDATE `discipline_organization_members`
SET `teacher_id` = (SELECT `id` FROM `teachers` WHERE `name` = 'WAFA FARHANA BINTI ABD KADIR' LIMIT 1),
    `display_name` = 'WAFA FARHANA BINTI ABD KADIR',
    `updated_at` = datetime('now')
WHERE `id` = 'org-2026-petang-wafa' AND `academic_year` = 2026;
--> statement-breakpoint
UPDATE `discipline_organization_members`
SET `teacher_id` = (SELECT `id` FROM `teachers` WHERE `name` = 'ZAMRIE BIN OMAR ALI' LIMIT 1),
    `display_name` = 'ZAMRIE BIN OMAR ALI',
    `updated_at` = datetime('now')
WHERE `id` = 'org-2026-petang-zamri' AND `academic_year` = 2026;
