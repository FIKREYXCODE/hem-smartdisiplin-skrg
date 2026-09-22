import { env } from "cloudflare:workers";
import type { AuditEvent, CaseRecord, CaseStatus, Role } from "./school";

type CaseRow = { id: string; reporter: string; reporter_id: string | null; session: string; class_id: string; class_name: string; student: string; student_id: string | null; date: string; time: string; category: string; notes: string; initial_action: string; status: string; created_at: string; updated_at: string; deleted_at: string | null; deleted_by: string | null };
type EventRow = { id: string; actor_name: string; actor_role: string; event_type: AuditEvent["eventType"]; action: string; created_at: string; before_data: string | null; after_data: string | null };

export function database() { if (!env.DB) throw new Error("D1 DB binding unavailable"); return env.DB; }
export function toEvent(row: EventRow): AuditEvent { return { id: row.id, actorName: row.actor_name, actorRole: row.actor_role as Role, eventType: row.event_type, action: row.action, createdAt: row.created_at, beforeData: row.before_data, afterData: row.after_data }; }
export async function toRecord(row: CaseRow): Promise<CaseRecord> {
  const eventRows = await database().prepare("SELECT id, actor_name, actor_role, event_type, action, created_at, before_data, after_data FROM case_events WHERE case_id = ? ORDER BY created_at ASC").bind(row.id).all<EventRow>();
  return { id: row.id, reporter: row.reporter, reporterId: row.reporter_id, session: row.session, classId: row.class_id, className: row.class_name, student: row.student, studentId: row.student_id, date: row.date, time: row.time, category: row.category, notes: row.notes, initialAction: row.initial_action, status: row.status as CaseStatus, createdAt: row.created_at, updatedAt: row.updated_at || row.created_at, deletedAt: row.deleted_at, deletedBy: row.deleted_by, events: eventRows.results.map(toEvent) };
}
export async function getCase(id: string) { const row = await database().prepare("SELECT * FROM cases WHERE id = ?").bind(id).first<CaseRow>(); return row ? toRecord(row) : null; }
export async function addEvent(caseId: string, actorId: string | null, actorName: string, actorRole: Role, eventType: AuditEvent["eventType"], action: string, beforeData: unknown = null, afterData: unknown = null) {
  await database().prepare("INSERT INTO case_events (id, case_id, actor_id, actor_name, actor_role, event_type, action, before_data, after_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), caseId, actorId, actorName, actorRole, eventType, action, beforeData ? JSON.stringify(beforeData) : null, afterData ? JSON.stringify(afterData) : null, new Date().toISOString()).run();
}
