import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const cases = sqliteTable("cases", {
  id: text("id").primaryKey(),
  reporter: text("reporter").notNull(),
  reporterId: text("reporter_id"),
  session: text("session").notNull(),
  classId: text("class_id").notNull(),
  className: text("class_name").notNull(),
  student: text("student").notNull(),
  studentId: text("student_id"),
  date: text("date").notNull(),
  time: text("time").notNull(),
  category: text("category").notNull(),
  notes: text("notes").notNull(),
  initialAction: text("initial_action").notNull().default(""),
  location: text("location").notNull().default(""),
  trafficStatus: text("traffic_status").notNull().default("red"),
  adminReviewRequested: integer("admin_review_requested").notNull().default(0),
  adminReviewRequestedAt: text("admin_review_requested_at"),
  status: text("status").notNull().default("disiplin"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull().default(""),
  deletedAt: text("deleted_at"),
  deletedBy: text("deleted_by"),
  history: text("history").notNull().default("[]"),
}, table => [index("idx_cases_created_at").on(table.createdAt), index("idx_cases_date").on(table.date), index("idx_cases_status").on(table.status)]);

export const disciplineActions = sqliteTable("discipline_actions", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => cases.id),
  actionType: text("action_type").notNull(),
  otherAction: text("other_action").notNull().default(""),
  details: text("details").notNull().default(""),
  actionDate: text("action_date").notNull().default(""),
  actionTime: text("action_time").notNull().default(""),
  additionalNotes: text("additional_notes").notNull().default(""),
  actionTypes: text("action_types").notNull().default("[]"),
  pupilFeedback: text("pupil_feedback").notNull().default(""),
  parentFeedback: text("parent_feedback").notNull().default(""),
  officerId: text("officer_id").notNull(),
  officerName: text("officer_name").notNull(),
  createdAt: text("created_at").notNull(),
}, table => [index("idx_discipline_actions_case_created").on(table.caseId, table.createdAt)]);

export const adminConfirmations = sqliteTable("admin_confirmations", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => cases.id),
  decision: text("decision").notNull(),
  adminId: text("admin_id").notNull(),
  adminName: text("admin_name").notNull(),
  position: text("position").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, table => [index("idx_admin_confirmations_case_created").on(table.caseId, table.createdAt)]);

export const ssdmRequests = sqliteTable("ssdm_requests", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => cases.id),
  pupilParentFeedback: text("pupil_parent_feedback").notNull().default(""),
  pupilFeedback: text("pupil_feedback").notNull().default(""),
  parentFeedback: text("parent_feedback").notNull().default(""),
  recommendation: text("recommendation").notNull(),
  otherRecommendation: text("other_recommendation").notNull().default(""),
  extraNotes: text("extra_notes").notNull().default(""),
  status: text("status").notNull().default("pending"),
  requestedById: text("requested_by_id").notNull(),
  requestedByName: text("requested_by_name").notNull(),
  requestedAt: text("requested_at").notNull(),
  decidedById: text("decided_by_id"),
  decidedByName: text("decided_by_name"),
  decidedByPosition: text("decided_by_position"),
  decidedAt: text("decided_at"),
  adminNotes: text("admin_notes").notNull().default(""),
  recordedAt: text("recorded_at"),
  recordedById: text("recorded_by_id"),
  recordedByName: text("recorded_by_name"),
}, table => [index("idx_ssdm_requests_case").on(table.caseId), index("idx_ssdm_requests_status").on(table.status)]);

export const caseEvents = sqliteTable("case_events", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => cases.id),
  actorId: text("actor_id"),
  actorName: text("actor_name").notNull(),
  actorRole: text("actor_role").notNull(),
  eventType: text("event_type").notNull(),
  action: text("action").notNull().default(""),
  beforeData: text("before_data"),
  afterData: text("after_data"),
  createdAt: text("created_at").notNull(),
}, table => [index("idx_case_events_case_id_created_at").on(table.caseId, table.createdAt)]);

export const caseAttachments = sqliteTable("case_attachments", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => cases.id),
  objectKey: text("object_key").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  uploadedById: text("uploaded_by_id"),
  uploadedByName: text("uploaded_by_name").notNull(),
  createdAt: text("created_at").notNull(),
}, table => [
  index("idx_case_attachments_case_id_created_at").on(table.caseId, table.createdAt),
  index("idx_case_attachments_object_key").on(table.objectKey),
]);

// Roster lives in D1, never in the Git repository. MyKad numbers are not stored.
export const teachers = sqliteTable("teachers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  email: text("email"),
  role: text("role").notNull().default("pelapor"),
  active: integer("active").notNull().default(1),
}, table => [index("idx_teachers_email").on(table.email)]);

export const classes = sqliteTable("classes", {
  id: text("id").primaryKey(),
  academicYear: integer("academic_year").notNull().default(2026),
  year: text("year").notNull(),
  name: text("name").notNull(),
  session: text("session"),
  classTeacherId: text("class_teacher_id"),
  classTeacher: text("class_teacher").notNull().default(""),
  active: integer("active").notNull().default(1),
}, table => [index("idx_classes_session_year").on(table.session, table.year), index("idx_classes_academic_year").on(table.academicYear)]);

export const students = sqliteTable("students", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  classId: text("class_id").notNull().references(() => classes.id),
  active: integer("active").notNull().default(1),
}, table => [index("idx_students_class_id_name").on(table.classId, table.name)]);

// A single incident can involve pupils from several classes. The legacy pupil
// and class columns on `cases` stay populated with the first participant so
// older records and integrations continue to work.
export const caseParticipants = sqliteTable("case_participants", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => cases.id),
  studentId: text("student_id").references(() => students.id),
  classId: text("class_id").notNull().references(() => classes.id),
  studentName: text("student_name").notNull(),
  className: text("class_name").notNull(),
  createdAt: text("created_at").notNull(),
}, table => [
  index("idx_case_participants_case").on(table.caseId),
  index("idx_case_participants_student").on(table.studentId),
  index("idx_case_participants_class").on(table.classId),
]);

export const userAccounts = sqliteTable("user_accounts", {
  userId: text("user_id").primaryKey().references(() => teachers.id),
  passwordHash: text("password_hash"),
  passwordSalt: text("password_salt"),
  passwordIterations: integer("password_iterations").notNull().default(210000),
  passwordSetAt: text("password_set_at"),
  resetAt: text("reset_at"),
  status: text("status").notNull().default("needs_setup"),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, table => [index("idx_user_accounts_active").on(table.active)]);

export const accountActivationTokens = sqliteTable("account_activation_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => teachers.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
}, table => [index("idx_activation_token_hash").on(table.tokenHash), index("idx_activation_user_active").on(table.userId, table.expiresAt)]);

export const userRoles = sqliteTable("user_roles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => teachers.id),
  role: text("role").notNull(),
  scopeId: text("scope_id"),
  position: text("position").notNull().default(""),
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by").notNull().default("system"),
}, table => [
  index("idx_user_roles_user_role").on(table.userId, table.role),
  index("idx_user_roles_role_scope").on(table.role, table.scopeId),
]);

export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => teachers.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
}, table => [index("idx_auth_sessions_token_hash").on(table.tokenHash), index("idx_auth_sessions_user_expires").on(table.userId, table.expiresAt)]);

export const accessAudit = sqliteTable("access_audit", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  actorName: text("actor_name").notNull(),
  actorRole: text("actor_role").notNull().default(""),
  eventType: text("event_type").notNull(),
  targetUserId: text("target_user_id"),
  details: text("details").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, table => [index("idx_access_audit_created").on(table.createdAt), index("idx_access_audit_user").on(table.userId)]);

export const disciplineOrganizationYears = sqliteTable("discipline_organization_years", {
  year: integer("year").primaryKey(),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const disciplineOrganizationMembers = sqliteTable("discipline_organization_members", {
  id: text("id").primaryKey(),
  academicYear: integer("academic_year").notNull().references(() => disciplineOrganizationYears.year),
  teacherId: text("teacher_id").references(() => teachers.id),
  displayName: text("display_name").notNull(),
  position: text("position").notNull(),
  unit: text("unit").notNull().default("Disiplin"),
  roleLabel: text("role_label").notNull().default("Ahli Jawatankuasa"),
  hierarchyLevel: integer("hierarchy_level").notNull().default(4),
  level: text("level").notNull(),
  session: text("session"),
  sortOrder: integer("sort_order").notNull().default(0),
  imageKey: text("image_key"),
  imageContentType: text("image_content_type"),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, table => [index("idx_discipline_org_year_level").on(table.academicYear, table.level), index("idx_discipline_org_hierarchy_order").on(table.academicYear, table.hierarchyLevel, table.sortOrder), index("idx_discipline_org_session_order").on(table.academicYear, table.session, table.sortOrder)]);
