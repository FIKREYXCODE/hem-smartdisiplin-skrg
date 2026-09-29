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
  year: text("year").notNull(),
  name: text("name").notNull(),
  session: text("session"),
  classTeacher: text("class_teacher").notNull().default(""),
  active: integer("active").notNull().default(1),
}, table => [index("idx_classes_session_year").on(table.session, table.year)]);

export const students = sqliteTable("students", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  classId: text("class_id").notNull().references(() => classes.id),
  active: integer("active").notNull().default(1),
}, table => [index("idx_students_class_id_name").on(table.classId, table.name)]);
