import { env } from "cloudflare:workers";
import type { AdminConfirmation, AuditEvent, CaseAttachment, CaseParticipant, CaseRecord, CaseStatus, DisciplineAction, Role, SsdmRequest, TrafficStatus } from "./school";

type CaseRow = { id: string; reporter: string; reporter_id: string | null; session: string; class_id: string; class_name: string; student: string; student_id: string | null; date: string; time: string; category: string; notes: string; initial_action: string; location: string; traffic_status: string; admin_review_requested: number; admin_review_requested_at: string | null; status: string; created_at: string; updated_at: string; deleted_at: string | null; deleted_by: string | null };
type EventRow = { id: string; actor_name: string; actor_role: string; event_type: AuditEvent["eventType"]; action: string; created_at: string; before_data: string | null; after_data: string | null };
type AttachmentRow = { id: string; filename: string; content_type: string; size: number; uploaded_by_name: string; created_at: string };
type DisciplineRow = { id: string; action_type: string; action_types: string; other_action: string; details: string; action_date: string; action_time: string; additional_notes: string; pupil_feedback: string; parent_feedback: string; officer_id: string; officer_name: string; created_at: string };
type ConfirmationRow = { id: string; decision: AdminConfirmation["decision"]; admin_id: string; admin_name: string; position: string; notes: string; created_at: string };
type SsdmRow = { id: string; pupil_parent_feedback: string; pupil_feedback: string; parent_feedback: string; recommendation: string; other_recommendation: string; extra_notes: string; status: SsdmRequest["status"]; requested_by_id: string; requested_by_name: string; requested_at: string; decided_by_id: string | null; decided_by_name: string | null; decided_by_position: string | null; decided_at: string | null; admin_notes: string; recorded_at:string|null; recorded_by_id:string|null; recorded_by_name:string|null };
type ParticipantRow = { id: string; student_id: string | null; student_name: string; class_id: string; class_name: string };

function decodeDisciplineNotes(value: string) {
  const fallback = { additionalNotes: value || "", witnessDetails: "", investigationDetails: "" };
  if (!value?.startsWith("[[DISCIPLINE_DETAIL_V1]]")) return fallback;
  try {
    const parsed = JSON.parse(value.slice("[[DISCIPLINE_DETAIL_V1]]".length)) as Record<string, unknown>;
    return {
      additionalNotes: String(parsed.additionalNotes || ""),
      witnessDetails: String(parsed.witnessDetails || ""),
      investigationDetails: String(parsed.investigationDetails || ""),
    };
  } catch { return fallback; }
}

export function database() { if (!env.DB) throw new Error("D1 DB binding unavailable"); return env.DB; }
export function bucket() { if (!env.BUCKET) throw new Error("R2 BUCKET binding unavailable"); return env.BUCKET; }
export function toEvent(row: EventRow): AuditEvent { return { id: row.id, actorName: row.actor_name, actorRole: row.actor_role as Role, eventType: row.event_type, action: row.action, createdAt: row.created_at, beforeData: row.before_data, afterData: row.after_data }; }
export function toAttachment(row: AttachmentRow): CaseAttachment { return { id: row.id, filename: row.filename, contentType: row.content_type, size: row.size, uploadedByName: row.uploaded_by_name, createdAt: row.created_at }; }
export async function toRecord(row: CaseRow): Promise<CaseRecord> {
  const [eventRows, attachmentRows, actionRows, confirmationRows, ssdmRow, participantRows] = await Promise.all([
    database().prepare("SELECT id, actor_name, actor_role, event_type, action, created_at, before_data, after_data FROM case_events WHERE case_id = ? ORDER BY created_at ASC").bind(row.id).all<EventRow>(),
    database().prepare("SELECT id, filename, content_type, size, uploaded_by_name, created_at FROM case_attachments WHERE case_id = ? ORDER BY created_at ASC").bind(row.id).all<AttachmentRow>(),
    database().prepare("SELECT id, action_type, action_types, other_action, details, action_date, action_time, additional_notes, pupil_feedback, parent_feedback, officer_id, officer_name, created_at FROM discipline_actions WHERE case_id = ? ORDER BY created_at ASC").bind(row.id).all<DisciplineRow>(),
    database().prepare("SELECT id, decision, admin_id, admin_name, position, notes, created_at FROM admin_confirmations WHERE case_id = ? ORDER BY created_at ASC").bind(row.id).all<ConfirmationRow>(),
    database().prepare("SELECT * FROM ssdm_requests WHERE case_id = ? ORDER BY requested_at DESC LIMIT 1").bind(row.id).first<SsdmRow>(),
    database().prepare("SELECT id, student_id, student_name, class_id, class_name FROM case_participants WHERE case_id = ? ORDER BY created_at ASC").bind(row.id).all<ParticipantRow>(),
  ]);
  const actions: DisciplineAction[] = actionRows.results.map(a => { let actionTypes:string[]=[];try{actionTypes=JSON.parse(a.action_types||"[]");}catch{}if(!actionTypes.length&&a.action_type)actionTypes=[a.action_type];const notes=decodeDisciplineNotes(a.additional_notes);return { id: a.id, actionType: a.action_type, actionTypes, otherAction: a.other_action, details: a.details, actionDate: a.action_date || a.created_at.slice(0, 10), actionTime: a.action_time || a.created_at.slice(11, 16), ...notes, pupilFeedback:a.pupil_feedback||"",parentFeedback:a.parent_feedback||"",officerId: a.officer_id, officerName: a.officer_name, createdAt: a.created_at };});
  const confirmations: AdminConfirmation[] = confirmationRows.results.map(a => ({ id: a.id, decision: a.decision, adminId: a.admin_id, adminName: a.admin_name, position: a.position, notes: a.notes, createdAt: a.created_at }));
  const ssdmRequest: SsdmRequest | null = ssdmRow ? { id: ssdmRow.id, pupilParentFeedback: ssdmRow.pupil_parent_feedback, pupilFeedback:ssdmRow.pupil_feedback||"",parentFeedback:ssdmRow.parent_feedback||ssdmRow.pupil_parent_feedback||"",recommendation: ssdmRow.recommendation, otherRecommendation: ssdmRow.other_recommendation, extraNotes: ssdmRow.extra_notes, status: ssdmRow.status, requestedById: ssdmRow.requested_by_id, requestedByName: ssdmRow.requested_by_name, requestedAt: ssdmRow.requested_at, decidedById: ssdmRow.decided_by_id, decidedByName: ssdmRow.decided_by_name, decidedByPosition: ssdmRow.decided_by_position, decidedAt: ssdmRow.decided_at, adminNotes: ssdmRow.admin_notes,recordedAt:ssdmRow.recorded_at,recordedById:ssdmRow.recorded_by_id,recordedByName:ssdmRow.recorded_by_name } : null;
  const participants: CaseParticipant[] = participantRows.results.length
    ? participantRows.results.map(item => ({ id: item.id, studentId: item.student_id, studentName: item.student_name, classId: item.class_id, className: item.class_name }))
    : [{ id: `legacy-${row.id}`, studentId: row.student_id, studentName: row.student, classId: row.class_id, className: row.class_name }];
  return { id: row.id, reporter: row.reporter, reporterId: row.reporter_id, session: row.session, classId: row.class_id, className: row.class_name, student: row.student, studentId: row.student_id, date: row.date, time: row.time, category: row.category, notes: row.notes, initialAction: row.initial_action, location: row.location || "", trafficStatus: (row.traffic_status || "red") as TrafficStatus, status: row.status as CaseStatus, createdAt: row.created_at, updatedAt: row.updated_at || row.created_at, adminReviewRequested: !!row.admin_review_requested, adminReviewRequestedAt: row.admin_review_requested_at, deletedAt: row.deleted_at, deletedBy: row.deleted_by, participants, events: eventRows.results.map(toEvent), attachments: attachmentRows.results.map(toAttachment), disciplineActions: actions, adminConfirmations: confirmations, ssdmRequest };
}
export async function getCase(id: string) { const row = await database().prepare("SELECT * FROM cases WHERE id = ?").bind(id).first<CaseRow>(); return row ? toRecord(row) : null; }
export async function addEvent(caseId: string, actorId: string | null, actorName: string, actorRole: Role, eventType: AuditEvent["eventType"], action: string, beforeData: unknown = null, afterData: unknown = null) {
  await database().prepare("INSERT INTO case_events (id, case_id, actor_id, actor_name, actor_role, event_type, action, before_data, after_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), caseId, actorId, actorName, actorRole, eventType, action, beforeData ? JSON.stringify(beforeData) : null, afterData ? JSON.stringify(afterData) : null, new Date().toISOString()).run();
}
